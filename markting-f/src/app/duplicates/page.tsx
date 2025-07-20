'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

// Import components with updated paths
import DuplicatesList from '@/app/duplicates/components/DuplicatesList';
import ContactPairModal from '@/app/duplicates/components/ContactPairModal';
import TwoContactMergeModal from '@/app/duplicates/components/TwoContactMergeModal';
import ProcessStatus from '@/app/duplicates/components/ProcessStatus';
import { useRouter } from 'next/navigation';

interface Contact {
    id: number;
    hubspotId: string;
    lastModifiedDate?: Date | string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    hs_additional_emails?: string;
}

interface DuplicateGroup {
    id: number;
    merged: boolean;
    group: Contact[];
}

interface ProcessProgress {
    currentStep: string;
    progress: number;
    totalGroups: number;
    processedGroups: number;
    currentBatch: number;
    totalBatches: number;
    isComplete: boolean;
    error?: string;
}

interface ProcessStatusData {
    id: number;
    name: string;
    process_name: string;
    status: string;
    count: number;
    api_key: string;
}

function DuplicatesPageContent() {
    const searchParams = useSearchParams();
    const apiKey = searchParams.get('apiKey') || '';
    const { getDuplicates, submitMerge, finishProcess, getActions, isAuthenticated, removeContact, mergeContacts, batchMergeContacts, resetMergeByGroup, getProcessProgress } = useRequest();
    const router = useRouter();

    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [processStatus, setProcessStatus] = useState<ProcessStatusData | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isPairModalOpen, setIsPairModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [contactsToMerge, setContactsToMerge] = useState<{ contact1: Contact | null; contact2: Contact | null }>({
        contact1: null,
        contact2: null,
    });
    const [selectedContactForTwoGroup, setSelectedContactForTwoGroup] = useState<{ [groupId: number]: number | null }>({});

    // Progress tracking state
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState<ProcessProgress>({
        currentStep: '',
        progress: 0,
        totalGroups: 0,
        processedGroups: 0,
        currentBatch: 0,
        totalBatches: 0,
        isComplete: false,
    });

    // Store interval ID to clear it when needed
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Check authentication on component mount
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
    }, [isAuthenticated]);

    // Fetch duplicates data
    const fetchDuplicates = async (page: number = 1) => {
        try {
            const data = await getDuplicates({
                apiKey,
                page,
                limit: 10,
            }) as any;
            console.log('Duplicates response:', data);
            setDuplicates(data.data);
            setTotalPages(data.totalPages);
            setCurrentPage(data.page);
        } catch (error) {
            console.error('Error fetching duplicates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Poll for updates every 5 seconds
    useEffect(() => {
        if (!apiKey) return;

        const checkStatus = async () => {
            try {
                const actions = await getActions() as any;
                const latestAction = actions.find((action: ProcessStatusData) => action.api_key === apiKey);
                setProcessStatus(latestAction || null);
            } catch (error) {
                console.error('Error checking process status:', error);
            }
        };

        intervalRef.current = setInterval(checkStatus, 5000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey]);

    // Handle initial load
    useEffect(() => {
        if (!apiKey) return;

        // Initial status check
        (async () => {
            try {
                console.log('Checking process status for apiKey:', apiKey);
                const actions = await getActions() as any;
                console.log('All actions:', actions);
                const latestAction = actions.find((action: ProcessStatusData) => action.api_key === apiKey);
                console.log('Latest action for this API key:', latestAction);
                setProcessStatus(latestAction || null);
            } catch (error) {
                console.error('Error checking process status:', error);
            }
        })();

        // Initial duplicates fetch
        (async () => {
            try {
                const data = await getDuplicates({
                    apiKey,
                    page: 1,
                    limit: 10,
                }) as any;
                setDuplicates(data.data);
                setTotalPages(data.totalPages);
                setCurrentPage(data.page);
            } catch (error) {
                console.error('Error fetching duplicates:', error);
            } finally {
                setIsLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey]);

    // Handle status change to manually merge - only fetch once when status changes
    useEffect(() => {
        if (processStatus?.process_name === 'manually merge') {
            // Clear the polling interval since we don't need to poll anymore
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            // Fetch duplicates data
            (async () => {
                try {
                    const data = await getDuplicates({
                        apiKey,
                        page: currentPage,
                        limit: 10,
                    }) as any;
                    setDuplicates(data.data);
                    setTotalPages(data.totalPages);
                } catch (error) {
                    console.error('Error fetching duplicates:', error);
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processStatus?.process_name]);

    const handleMergeClick = (group: DuplicateGroup) => {
        setSelectedGroup(group);
        if (group.group.length === 2) {
            // Check if a contact is selected for this 2-contact group
            const selectedContactId = selectedContactForTwoGroup[group.id];
            if (selectedContactId) {
                // Proceed with direct merge
                const selectedContact = group.group.find(c => c.id === selectedContactId);
                const otherContact = group.group.find(c => c.id !== selectedContactId);
                if (selectedContact && otherContact) {
                    handleDirectMerge(group, selectedContact, otherContact);
                }
            } else {
                // Show modal to select which contact to keep
                setContactsToMerge({
                    contact1: group.group[0],
                    contact2: group.group[1],
                });
                setIsMergeModalOpen(true);
            }
        } else {
            // If more than 2 contacts, show pair selection modal
            setIsPairModalOpen(true);
        }
    };

    const handleContactSelect = (groupId: number, contactId: number) => {
        setSelectedContactForTwoGroup(prev => ({
            ...prev,
            [groupId]: prev[groupId] === contactId ? null : contactId // Toggle selection
        }));
    };

    const handleDirectMerge = async (group: DuplicateGroup, selectedContact: Contact, removedContact: Contact) => {
        try {
            // Use the new merge endpoint - this now only creates pending records
            const mergeData = {
                groupId: group.id,
                primaryAccountId: selectedContact.hubspotId,
                secondaryAccountId: removedContact.hubspotId,
                apiKey,
            };

            const result = await mergeContacts(mergeData) as { message: string; details?: any };
            alert(`✅ ${result.message}\n\n⚠️ Remember to click "Finish Process" to complete the merges in HubSpot.`);

            // Clear selection for this group
            setSelectedContactForTwoGroup(prev => ({
                ...prev,
                [group.id]: null
            }));

            // Refresh duplicates list
            await fetchDuplicates(currentPage);
        } catch (error) {
            console.error('Error during direct merge:', error);
            alert('❌ Error merging contacts. Please try again.\n\nError details: ' + (error as Error).message);
        }
    };

    const handleContactPairSelection = (contact1: Contact, contact2: Contact) => {
        setContactsToMerge({ contact1, contact2 });
        setIsPairModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleContactRemoval = async (contact: Contact) => {
        if (!selectedGroup) return;

        try {
            const result = await removeContact({
                contactId: contact.id,
                groupId: selectedGroup.id,
                apiKey,
            }) as { message: string };

            alert(`✅ ${result.message}`);

            // Refresh duplicates list
            await fetchDuplicates(currentPage);

            // If the group was deleted, close the modal
            const updatedGroup = selectedGroup.group.filter(c => c.id !== contact.id);
            if (updatedGroup.length < 2) {
                setIsPairModalOpen(false);
                setSelectedGroup(null);
            } else {
                // Update the selected group with remaining contacts
                setSelectedGroup({
                    ...selectedGroup,
                    group: updatedGroup,
                });
            }
        } catch (error) {
            console.error('Error removing contact:', error);
            alert('❌ Error removing contact. Please try again.\n\nError details: ' + (error as Error).message);
        }
    };

    const handleMergeSubmit = async (mergeData: {
        groupId: number;
        selectedContactId: number;
        selectedContactHubspotId: string;
        updatedData: Record<string, string>;
        removedIds: number[];
        allContactsData: Contact[];
    }) => {
        try {
            console.log('Submitting merge with enhanced data:', mergeData);

            // If there's only one contact being removed, use the new merge endpoint
            if (mergeData.removedIds.length === 1) {
                const removedContact = mergeData.allContactsData.find(c =>
                    mergeData.removedIds.includes(c.id)
                );

                if (removedContact) {
                    const newMergeData = {
                        groupId: mergeData.groupId,
                        primaryAccountId: mergeData.selectedContactHubspotId,
                        secondaryAccountId: removedContact.hubspotId,
                        apiKey,
                    };

                    const result = await mergeContacts(newMergeData) as {
                        success: boolean;
                        message: string;
                        mergeId?: number;
                        details?: any;
                    };
                    console.log('Merge submitted successfully:', result);

                    // Refresh duplicates list
                    await fetchDuplicates(currentPage);
                    setIsMergeModalOpen(false);
                    setIsPairModalOpen(false);
                    setSelectedGroup(null);
                    setContactsToMerge({ contact1: null, contact2: null });

                    // Show success message with reminder to finish process
                    const successMessage = `
✅ Merge record created successfully!

📋 Details:
• Primary Contact: ${mergeData.selectedContactHubspotId}
• Pending Merge Contact: ${removedContact.hubspotId}
• Merge ID: ${result.mergeId || 'N/A'}

⚠️ IMPORTANT: This merge is now PENDING. 
Remember to click "Finish Process" to complete all merges in HubSpot.
                    `.trim();

                    alert(successMessage);
                    return;
                }
            }

            // For multiple contacts, use batch merge endpoint
            if (mergeData.removedIds.length > 1) {
                const removedContacts = mergeData.allContactsData.filter(c =>
                    mergeData.removedIds.includes(c.id)
                );

                const batchMergeData = {
                    groupId: mergeData.groupId,
                    primaryAccountId: mergeData.selectedContactHubspotId,
                    secondaryAccountIds: removedContacts.map(c => c.hubspotId),
                    apiKey,
                };

                const result = await batchMergeContacts(batchMergeData) as {
                    success: boolean;
                    message: string;
                    results?: any[];
                    errors?: any[];
                };
                console.log('Batch merge submitted successfully:', result);

                // Refresh duplicates list
                await fetchDuplicates(currentPage);
                setIsMergeModalOpen(false);
                setIsPairModalOpen(false);
                setSelectedGroup(null);
                setContactsToMerge({ contact1: null, contact2: null });

                // Show success message with reminder to finish process
                const successMessage = `
✅ Batch merge records created successfully!

📋 Details:
• Primary Contact: ${mergeData.selectedContactHubspotId}
• Created ${result.results?.length || 0} pending merge records
${result.errors?.length ? `• ${result.errors.length} records failed to create` : ''}

⚠️ IMPORTANT: These merges are now PENDING. 
Remember to click "Finish Process" to complete all merges in HubSpot.
                `.trim();

                alert(successMessage);
                return;
            }

            // For multiple contacts or fallback, use the old endpoint
            const result = await submitMerge({
                ...mergeData,
                apiKey,
            }) as { message: string; details?: any };

            console.log('Merge submitted successfully:', result);

            // Refresh duplicates list
            await fetchDuplicates(currentPage);
            setIsMergeModalOpen(false);
            setIsPairModalOpen(false);
            setSelectedGroup(null);
            setContactsToMerge({ contact1: null, contact2: null });

            // Show detailed success message
            const removedContactsInfo = mergeData.allContactsData
                .filter(contact => mergeData.removedIds.includes(contact.id))
                .map(contact => contact.hubspotId);

            const successMessage = `
✅ Merge operation submitted successfully!

📋 Details:
• Selected Contact: ${mergeData.selectedContactHubspotId}
• Processed ${mergeData.removedIds.length} contact(s):
  ${removedContactsInfo.map(id => `  - ${id}`).join('\n  ')}
• Updated ${Object.keys(mergeData.updatedData).filter(key => !['recordId', 'hubspotId'].includes(key)).length} field(s):
  ${Object.entries(mergeData.updatedData)
                    .filter(([key]) => !['recordId', 'hubspotId'].includes(key))
                    .map(([field, value]) => `  - ${field}: ${value}`)
                    .join('\n  ')}}

⚠️ Remember to click "Finish Process" to complete all operations in HubSpot.
            `.trim();

            alert(successMessage);

        } catch (error) {
            console.error('Error submitting merge:', error);
            alert('❌ Error merging contacts. Please try again.\n\nError details: ' + (error as Error).message);
        }
    };

    const handleFinishProcess = async () => {
        try {
            // Show loading message with enhanced functionality description
            const confirmation = confirm(
                '🔄 This will:\n' +
                '• Automatically merge all remaining duplicate groups (oldest contacts as primary)\n' +
                '• Update modified contacts in HubSpot\n' +
                '• Remove marked contacts from HubSpot\n' +
                '• Generate Excel report\n' +
                '• Clean up temporary data\n\n' +
                'This process may take several minutes for large datasets. Continue?'
            );

            if (!confirmation) return;

            // Start processing and progress tracking
            setIsProcessing(true);

            // Start the finish process (non-blocking)
            const finishPromise = finishProcess({ apiKey });

            // Start polling for progress
            const progressInterval = setInterval(async () => {
                try {
                    const progress = await getProcessProgress(apiKey) as ProcessProgress;
                    setProcessingProgress(progress);

                    if (progress.isComplete) {
                        clearInterval(progressInterval);
                        setIsProcessing(false);
                    }
                } catch (error) {
                    console.error('Error fetching progress:', error);
                }
            }, 2000); // Poll every 2 seconds

            // Wait for the process to complete
            const result = await finishPromise as { message: string; excelUrl: string };

            // Clean up
            clearInterval(progressInterval);
            setIsProcessing(false);

            alert(`✅ Process completed successfully!\n\n📊 Excel file: ${result.excelUrl}\n\nAll duplicates have been merged, modified contacts updated, and removed contacts processed.`);

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (error) {
            setIsProcessing(false);
            console.error('Error finishing process:', error);
            alert('❌ Error finishing process. Please try again.\n\nError details: ' + (error as Error).message);
        }
    };

    const handleResetClick = async (group: DuplicateGroup) => {
        try {
            console.log('Resetting merged group:', group.id);

            const result = await resetMergeByGroup({
                groupId: group.id,
                apiKey,
            }) as { message: string };

            console.log('Group reset successfully:', result);

            // Refresh duplicates list
            await fetchDuplicates(currentPage);

            alert(`✅ ${result.message}`);
        } catch (error) {
            console.error('Error resetting group:', error);
            alert('❌ Error resetting group. Please try again.\n\nError details: ' + (error as Error).message);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading duplicates...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Duplicate Management</h1>
                    <p className="mt-2 text-gray-600">Review and merge duplicate contacts</p>
                </div>

                {/* Process Status */}
                <ProcessStatus
                    status={processStatus}
                    onFinish={handleFinishProcess}
                />

                {/* Progress Bar for Finish Process */}
                {isProcessing && (
                    <div className="mb-8 bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing...</h2>

                        {/* Current Step */}
                        <div className="mb-2">
                            <p className="text-sm text-gray-600">{processingProgress.currentStep}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{processingProgress.progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${processingProgress.progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Detailed Progress Info */}
                        {processingProgress.totalGroups > 0 && (
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                    <span className="font-medium">Groups:</span> {processingProgress.processedGroups} / {processingProgress.totalGroups}
                                </div>
                                {processingProgress.totalBatches > 0 && (
                                    <div>
                                        <span className="font-medium">Batch:</span> {processingProgress.currentBatch} / {processingProgress.totalBatches}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error Display */}
                        {processingProgress.error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{processingProgress.error}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Duplicates List */}
                {void console.log(duplicates, "5555555555555")}
                {processStatus?.process_name === 'manually merge' && (
                    <>
                        <DuplicatesList
                            duplicates={duplicates}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => {
                                setCurrentPage(page);
                                fetchDuplicates(page);
                            }}
                            onMergeClick={handleMergeClick}
                            onResetClick={handleResetClick}
                            onRefresh={() => fetchDuplicates(currentPage)}
                            selectedContactForTwoGroup={selectedContactForTwoGroup}
                            onContactSelect={handleContactSelect}
                        />

                        {/* Show additional emails for each contact in the group if present */}
                        <div className="mt-4">
                            {duplicates.map((group) => (
                                <div key={group.id} className="mb-2">
                                    {group.group.map((contact) => (
                                        contact.hs_additional_emails ? (
                                            <div key={contact.id} className="text-xs text-gray-500 pl-4">
                                                Additional Emails: {contact.hs_additional_emails}
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Contact Pair Selection Modal */}
                        <ContactPairModal
                            isOpen={isPairModalOpen}
                            group={selectedGroup}
                            onClose={() => {
                                setIsPairModalOpen(false);
                                setSelectedGroup(null);
                            }}
                            onMergePair={handleContactPairSelection}
                            onRemoveContact={handleContactRemoval}
                        />

                        {/* Two Contact Merge Modal */}
                        <TwoContactMergeModal
                            isOpen={isMergeModalOpen}
                            contact1={contactsToMerge.contact1}
                            contact2={contactsToMerge.contact2}
                            groupId={selectedGroup?.id || 0}
                            onClose={() => {
                                setIsMergeModalOpen(false);
                                setContactsToMerge({ contact1: null, contact2: null });
                                setSelectedGroup(null);
                            }}
                            onSubmit={handleMergeSubmit}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default function DuplicatesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DuplicatesPageContent />
        </Suspense>
    );
}
