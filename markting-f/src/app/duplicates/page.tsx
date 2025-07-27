'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

// Import components with updated paths
import DuplicatesList from '@/app/duplicates/components/DuplicatesList';
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
    const { getDuplicates, finishProcess, getActions, isAuthenticated, mergeContacts, getProcessProgress } = useRequest();
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

    const limit = 1;

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
                limit,
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
                const latestAction = actions.data.find((action: ProcessStatusData) => action.api_key === apiKey);
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
                const latestAction = actions.data.find((action: ProcessStatusData) => action.api_key === apiKey);
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
                    limit,
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
                        limit,
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
        } else if (group.group.length > 2) {
            // For groups with >2 contacts, merge all using selected primary
            const selectedPrimaryId = selectedContactForTwoGroup[group.id];
            if (!selectedPrimaryId) {
                alert('Please select a primary contact before merging.');
                return;
            }
            const primaryContact = group.group.find(c => c.id === selectedPrimaryId);
            if (!primaryContact) {
                alert('Selected primary contact not found.');
                return;
            }
            // All other contacts are secondary
            const secondaryContacts = group.group.filter(c => c.id !== selectedPrimaryId).map(c => c.hubspotId);
            const mergeData = {
                groupId: group.id,
                primaryAccountId: primaryContact.hubspotId,
                secondaryAccountId: secondaryContacts,
                apiKey,
            };
            (async () => {
                try {
                    const result = await mergeContacts(mergeData) as { success: boolean; message: string; mergeId?: number; details?: any };
                    alert(`✅ ${result.message}\n\n⚠️ Remember to click "Finish Process" to complete the merges in HubSpot.`);
                    // Clear selection for this group
                    setSelectedContactForTwoGroup(prev => ({ ...prev, [group.id]: null }));
                    // Refresh duplicates list
                    await fetchDuplicates(currentPage);
                } catch (error) {
                    console.error('Error during merge all:', error);
                    alert('❌ Error merging contacts. Please try again.\n\nError details: ' + (error as Error).message);
                }
            })();
        } else {
            // If more than 2 contacts, show pair selection modal (fallback)
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
                secondaryAccountId: [removedContact.hubspotId],
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
                            onRefresh={() => fetchDuplicates(currentPage)}
                            selectedContactForTwoGroup={selectedContactForTwoGroup}
                            onContactSelect={handleContactSelect}
                            limit={limit} // Pass limit to control items per page
                        />

                        {/* Merge All Selected Button */}
                        <div className="mt-8 flex justify-end">
                            <button
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={async () => {
                                    // Gather all selected contacts for each group
                                    const mergePromises = [];
                                    for (const group of duplicates) {
                                        const selectedId = selectedContactForTwoGroup[group.id];
                                        if (selectedId) {
                                            const primaryContact = group.group.find(c => c.id === selectedId);
                                            if (!primaryContact) continue;
                                            const secondaryContacts = group.group.filter(c => c.id !== selectedId).map(c => c.hubspotId);
                                            if (secondaryContacts.length === 0) continue;
                                            const mergeData = {
                                                groupId: group.id,
                                                primaryAccountId: primaryContact.hubspotId,
                                                secondaryAccountId: secondaryContacts,
                                                apiKey,
                                            };
                                            mergePromises.push(
                                                mergeContacts(mergeData)
                                                    .then((result: any) => ({ groupId: group.id, success: true, message: result.message }))
                                                    .catch((error: any) => ({ groupId: group.id, success: false, message: error.message }))
                                            );
                                        }
                                    }
                                    if (mergePromises.length === 0) {
                                        alert('Please select at least one contact in each group to merge.');
                                        return;
                                    }
                                    const results = await Promise.all(mergePromises);
                                    const successCount = results.filter(r => r.success).length;
                                    const failCount = results.length - successCount;
                                    let message = `✅ Merged ${successCount} group(s) successfully.`;
                                    if (failCount > 0) {
                                        message += `\n❌ Failed to merge ${failCount} group(s).`;
                                    }
                                    message += '\n\n⚠️ Remember to click "Finish Process" to complete the merges in HubSpot.';
                                    alert(message);
                                    // Clear selection for merged groups
                                    setSelectedContactForTwoGroup(prev => {
                                        const updated = { ...prev };
                                        for (const r of results) {
                                            if (r.success) updated[r.groupId] = null;
                                        }
                                        return updated;
                                    });
                                    // Refresh duplicates list
                                    await fetchDuplicates(currentPage);
                                }}
                                disabled={Object.values(selectedContactForTwoGroup).filter(Boolean).length === 0}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                                Merge All Selected
                            </button>
                        </div>
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
