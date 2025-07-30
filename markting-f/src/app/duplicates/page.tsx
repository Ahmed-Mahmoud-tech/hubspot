'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

// Import components with updated paths
import DuplicatesList from '@/app/duplicates/components/DuplicatesList';
import ProcessStatus from '@/app/duplicates/components/ProcessStatus';
import { useRouter } from 'next/navigation';
import { PlanModal } from '@/app/plan';

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

export default function DuplicatesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DuplicatesPageContent />
        </Suspense>
    );
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
    const apiKey = searchParams?.get('apiKey') || '';
    const { getDuplicates, finishProcess, getActions, isAuthenticated, mergeContacts, getProcessProgress, getUserPlan, getLatestAction, createUserPlan } = useRequest();
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

    const [userPlan, setUserPlan] = useState<any | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    // TODO: Replace with actual userId from auth context or API
    const userId = userPlan?.userId;
    const limit = 10;

    // Store interval ID to clear it when needed
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Check authentication on component mount
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
        // Fetch user plan
        (async () => {
            try {
                const plan = await getUserPlan();
                console.log("000", !!plan, "555555555555555555");
                setUserPlan(plan);

                if (!plan) {
                    // If user has no plan and contactCount <= 500000, create a free plan
                    const contactCount = processStatus?.count ?? 0;
                    if (contactCount <= 500000) {
                        const freePlan = await createUserPlan({
                            planType: 'free',
                            contactCount,
                            activationDate: new Date().toISOString(),
                            paymentStatus: 'active',
                            apiKey,
                        });
                        setUserPlan(freePlan);
                    }
                }
            } catch (err) {
                setUserPlan(null);
                // If user has no plan and contactCount <= 500000, create a free plan

            }
        })();
    }, [apiKey, processStatus?.count]);

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
                const response = await getLatestAction(apiKey);
                let latestAction = null;
                if (response && typeof response === 'object' && 'data' in response) {
                    latestAction = (response as any).data?.data ?? null;
                }
                setProcessStatus(latestAction);
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
                // const latestAction = actions.data.data.find((action: ProcessStatusData) => action.api_key === apiKey);
                const response = await getLatestAction(apiKey);
                console.log("6666666666666666666", response);

                let latestAction = null;
                if (response && typeof response === 'object' && 'data' in response) {
                    latestAction = (response as any).data?.data ?? null;
                } console.log('All actions:', actions);
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
        // PLAN VALIDATION
        if (!userPlan) {
            alert('User plan not loaded. Please refresh and try again.');
            return;
        }
        if (userPlan.planType === 'free' && userPlan.mergeGroupsUsed >= 20) {
            alert('Free plan limit reached: You can only merge up to 20 groups. Upgrade your plan to continue.');
            return;
        }
        if (userPlan.planType === 'paid' && userPlan.contactLimit && userPlan.contactCount >= userPlan.contactLimit) {
            alert('Paid plan contact limit reached. Please upgrade your plan to add more contacts.');
            return;
        }

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
                    const response = await mergeContacts(mergeData);
                    const result = response.data as { success: boolean; message: string; mergeId?: number; details?: any };
                    if (result && result.success) {
                        alert(`✅ ${result.message}\n\n⚠️ Remember to click "Finish Process" to complete the merges in HubSpot.`);
                        // Clear selection for this group
                        setSelectedContactForTwoGroup(prev => ({ ...prev, [group.id]: null }));
                        // Refresh duplicates list
                        await fetchDuplicates(currentPage);
                    } else {
                        alert('❌ Merge failed. Please try again.');
                    }
                } catch (error: any) {
                    console.error('Error during merge all:', error);
                    alert('❌ Error merging contacts. Please try again.\n\nError details: ' + (error?.message || error?.toString()));
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

            const response = await mergeContacts(mergeData);
            const result = response.data as { message: string; details?: any };
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
            const finishPromise = finishProcess();

            // Start polling for progress
            const progressInterval = setInterval(async () => {
                try {
                    const response = await getProcessProgress();
                    const progress = response.data as ProcessProgress;
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
            const finishResponse = await finishPromise;
            const result = finishResponse.data as { message: string; excelUrl: string };

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
    // PLAN ENFORCEMENT LOGIC
    // Use count from processStatus (getLatestAction().data.data.count) if available
    // (removed duplicate declaration)
    useEffect(() => {
        const showPlanModal =
            !userPlan ||
            (userPlan.planType === 'free' && ((processStatus?.count ?? 0) > 500000 || userPlan.mergeGroupsUsed >= 20)) ||
            (userPlan.planType === 'paid' && userPlan.paymentStatus !== 'active');
        setShowPlanModal(showPlanModal);

    }, [isProcessing, processStatus, userPlan]);




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
            {showPlanModal && (
                <PlanModal
                    apiKey={apiKey}
                    open={true}
                    onClose={() => { setShowPlanModal(false); }}
                    userId={userId}
                    plan={userPlan}
                    contactCount={processStatus?.count ?? 0}
                />
            )}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Duplicate Management</h1>
                        <p className="mt-2 text-gray-600">Review and merge duplicate contacts</p>
                    </div>
                    {/* {(userPlan?.planType === 'free' || !userPlan) && ( */}
                    <button
                        className="mt-4 sm:mt-0 inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition"
                        onClick={() => setShowPlanModal(true)}
                    >
                        Upgrade Plan
                    </button>
                    {/* )} */}
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
                    </>
                )}
            </div>
        </div>
    );
}
