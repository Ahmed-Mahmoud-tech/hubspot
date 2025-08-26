'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

// Import components with updated paths
import DuplicatesList from './components/DuplicatesList';
import ProcessStatus from './components/ProcessStatus';
import FieldSelectionModal from './components/FieldSelectionModal';
import { useRouter } from 'next/navigation';
import { PlanModal } from '@/app/plan';
import { freeContactLimit, freeMergeGroupLimit } from '@/constant/main';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setSelectedContact, clearSelectionsByGroupIds, clearAllSelections } from '@/redux/slices/duplicatesSlice';

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
    otherProperties?: Record<string, any>;
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
    const { getDuplicates, finishProcess, getActions, isAuthenticated, mergeContacts, getUserPlan, getLatestAction, createUserPlan, updateContact, bulkMergeGroups } = useRequest();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const selectedContactForTwoGroup = useAppSelector(state => state.duplicates.selectedContactForTwoGroup);

    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [processStatus, setProcessStatus] = useState<ProcessStatusData | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isFieldSelectionModalOpen, setIsFieldSelectionModalOpen] = useState(false);
    const [isBulkMerging, setIsBulkMerging] = useState(false);

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
                    if (contactCount <= freeContactLimit) {
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
            } catch {
                setUserPlan(null);
                // If user has no plan and contactCount <= 500000, create a free plan

            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

                // Stop interval and show error if status is 'error'
                if (latestAction && latestAction.status === 'error') {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    setProcessStatus(latestAction);

                    return;
                }

                // Stop interval if process_name is 'exceed'
                if (latestAction && latestAction.process_name === 'exceed' && intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                } else {
                    setProcessStatus(latestAction);
                }
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
            toast.error('User plan not loaded. Please refresh and try again.');
            return;
        }
        if (userPlan.planType === 'free' && userPlan.mergeGroupsUsed >= freeMergeGroupLimit) {
            toast.warn(`Free plan limit reached: You can only merge up to ${freeMergeGroupLimit} groups. Upgrade your plan to continue.`);
            return;
        }
        if (userPlan.planType === 'paid' && userPlan.contactLimit && userPlan.contactCount >= userPlan.contactLimit) {
            toast.warn('Paid plan contact limit reached. Please upgrade your plan to add more contacts.');
            return;
        }

        // Check if a contact is selected for this group
        const selectedContactId = selectedContactForTwoGroup[group.id];
        if (!selectedContactId) {
            toast.info('Please select a primary contact before merging.');
            return;
        }

        // Open field selection modal
        setIsFieldSelectionModalOpen(true);
    };

    const handleContactSelect = (groupId: number, contactId: number) => {
        dispatch(setSelectedContact({
            groupId,
            contactId: selectedContactForTwoGroup[groupId] === contactId ? null : contactId
        }));
    };

    const handleBulkMergeAll = async () => {
        // Get all selected groups from Redux (across all pages)
        const selectedGroupIds = Object.keys(selectedContactForTwoGroup).map(Number);

        if (selectedGroupIds.length === 0) {
            toast.info('Please select primary contacts for the groups you want to merge.');
            return;
        }

        // PLAN VALIDATION
        if (!userPlan) {
            toast.error('User plan not loaded. Please refresh and try again.');
            return;
        }

        const mergeCount = selectedGroupIds.length;
        if (userPlan.planType === 'free' && (userPlan.mergeGroupsUsed + mergeCount) > freeMergeGroupLimit) {
            toast.warn(`Free plan limit exceeded: You can only merge up to ${freeMergeGroupLimit} groups total. You have ${userPlan.mergeGroupsUsed} used and are trying to merge ${mergeCount} more.`);
            return;
        }

        if (userPlan.planType === 'paid' && userPlan.contactLimit && userPlan.contactCount >= userPlan.contactLimit) {
            toast.warn('Paid plan contact limit reached. Please upgrade your plan to add more contacts.');
            return;
        }

        setIsBulkMerging(true);

        try {
            toast.info(`Starting merge of ${selectedGroupIds.length} groups across all pages...`);

            // Fetch all groups across all pages to get complete group data
            const allSelectedGroups: any[] = [];
            let currentPageNum = 1;
            let hasMorePages = true;

            while (hasMorePages && allSelectedGroups.length < selectedGroupIds.length) {
                const pageResponse = await getDuplicates({
                    apiKey,
                    page: currentPageNum,
                    limit: limit,
                }) as any;

                const pageGroups = pageResponse.data || [];
                const selectedGroupsOnThisPage = pageGroups.filter((group: any) => selectedGroupIds.includes(group.id));
                allSelectedGroups.push(...selectedGroupsOnThisPage);

                hasMorePages = currentPageNum < pageResponse.totalPages;
                currentPageNum++;
            }

            if (allSelectedGroups.length === 0) {
                toast.error('No matching groups found. The selected groups may have been merged already.');
                return;
            }

            // Prepare bulk merge payload - same as handleBulkMerge
            const bulkMergePayload = {
                groups: allSelectedGroups.map((group: any) => {
                    const selectedContactId = selectedContactForTwoGroup[group.id];
                    const primaryContact = group.group.find((c: any) => c.id === selectedContactId);
                    const secondaryContacts = group.group.filter((c: any) => c.id !== selectedContactId);

                    return {
                        groupId: group.id,
                        primaryAccountId: primaryContact.hubspotId,
                        secondaryAccountIds: secondaryContacts.map((c: any) => c.hubspotId),
                        apiKey,
                    };
                }).filter((group: any) => group.primaryAccountId && group.secondaryAccountIds.length > 0), // Filter out invalid groups
                apiKey,
            };

            console.log('🔄 BULK MERGE ALL - Sending bulk merge request:', bulkMergePayload);

            const response = await bulkMergeGroups(bulkMergePayload);
            console.log('✅ BULK MERGE ALL - Bulk merge response:', response);
            const result = response.data as {
                success?: boolean;
                message?: string;
                results?: Array<{ groupId: number, success: boolean, message?: string, error?: string }>;
                summary?: { total: number, successful: number, failed: number }
            };

            if (result && result.success && result.summary) {
                const successfulResults = result.results?.filter(r => r.success) || [];
                const successfulGroupIds = successfulResults.map(r => r.groupId);

                toast.success(`✅ Merge completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);

                // Clear primary contact selections for successfully merged groups using Redux
                if (successfulGroupIds.length > 0) {
                    dispatch(clearSelectionsByGroupIds(successfulGroupIds));
                }

                // Refresh duplicates list
                await fetchDuplicates(currentPage);
            } else {
                console.error('❌ BULK MERGE ALL - Merge failed, result:', result);
                toast.error(`❌ Bulk merge failed: ${result?.message || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('❌ BULK MERGE ALL - Error during bulk merge:', error);
            toast.error('❌ Error processing bulk merge. Please try again.\n\nError details: ' + (error?.message || error?.toString()));
        } finally {
            setIsBulkMerging(false);
        }
    };

    const handleBulkMerge = async () => {
        // Get groups on current page that have a primary contact selected
        const groupsWithPrimarySelection = duplicates.filter(group => selectedContactForTwoGroup[group.id]);

        if (groupsWithPrimarySelection.length === 0) {
            const totalSelected = Object.keys(selectedContactForTwoGroup).length;
            if (totalSelected > 0) {
                toast.info('No selected groups found on the current page. Use "Merge All Selected" to merge groups from all pages.');
            } else {
                toast.info('Please select primary contacts for the groups you want to merge.');
            }
            return;
        }

        // PLAN VALIDATION
        if (!userPlan) {
            toast.error('User plan not loaded. Please refresh and try again.');
            return;
        }

        const mergeCount = groupsWithPrimarySelection.length;
        if (userPlan.planType === 'free' && (userPlan.mergeGroupsUsed + mergeCount) > freeMergeGroupLimit) {
            toast.warn(`Free plan limit exceeded: You can only merge up to ${freeMergeGroupLimit} groups total. You have ${userPlan.mergeGroupsUsed} used and are trying to merge ${mergeCount} more.`);
            return;
        }

        if (userPlan.planType === 'paid' && userPlan.contactLimit && userPlan.contactCount >= userPlan.contactLimit) {
            toast.warn('Paid plan contact limit reached. Please upgrade your plan to add more contacts.');
            return;
        }

        setIsBulkMerging(true);

        try {
            toast.info(`Starting merge of ${groupsWithPrimarySelection.length} groups on current page...`);

            // Prepare bulk merge payload
            const bulkMergePayload = {
                groups: groupsWithPrimarySelection.map((group: any) => {
                    const selectedContactId = selectedContactForTwoGroup[group.id];
                    const primaryContact = group.group.find((c: any) => c.id === selectedContactId);
                    const secondaryContacts = group.group.filter((c: any) => c.id !== selectedContactId);

                    return {
                        groupId: group.id,
                        primaryAccountId: primaryContact.hubspotId,
                        secondaryAccountIds: secondaryContacts.map((c: any) => c.hubspotId),
                        apiKey,
                    };
                }).filter((group: any) => group.primaryAccountId && group.secondaryAccountIds.length > 0), // Filter out invalid groups
                apiKey,
            };

            console.log('🔄 BULK MERGE CURRENT - Sending bulk merge request:', bulkMergePayload);

            try {
                const response = await bulkMergeGroups(bulkMergePayload);
                console.log('✅ BULK MERGE CURRENT - Bulk merge response:', response);
                const result = response.data as {
                    success?: boolean;
                    message?: string;
                    results?: Array<{ groupId: number, success: boolean, message?: string, error?: string }>;
                    summary?: { total: number, successful: number, failed: number }
                };

                if (result && result.success && result.summary) {
                    const successfulResults = result.results?.filter(r => r.success) || [];
                    const successfulGroupIds = successfulResults.map(r => r.groupId);

                    toast.success(`✅ Merge completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);

                    // Clear primary contact selections for successfully merged groups using Redux
                    if (successfulGroupIds.length > 0) {
                        dispatch(clearSelectionsByGroupIds(successfulGroupIds));
                    }

                    // Refresh duplicates list
                    await fetchDuplicates(currentPage);
                } else {
                    console.error('❌ BULK MERGE CURRENT - Merge failed, result:', result);
                    toast.error(`❌ Bulk merge failed: ${result?.message || 'Unknown error'}`);
                }
            } catch (error: any) {
                console.error('❌ BULK MERGE CURRENT - Error during bulk merge:', error);
                toast.error('❌ Error processing bulk merge. Please try again.\n\nError details: ' + (error?.message || error?.toString()));
            }
        } catch (error: any) {
            console.error('Error during bulk merge:', error);
            toast.error('❌ Error processing bulk merge. Please try again.\n\nError details: ' + (error?.message || error?.toString()));
        } finally {
            setIsBulkMerging(false);
        }
    };

    const handleFieldSelectionConfirm = async (updatedPrimaryData: any) => {
        if (!selectedGroup) return;

        const selectedContactId = selectedContactForTwoGroup[selectedGroup.id];
        if (!selectedContactId) {
            toast.info('No primary contact selected');
            return;
        }

        // Find the primary contact index for updating UI
        const primaryContactIndex = selectedGroup.group.findIndex(c => c.id === selectedContactId);
        const primaryContact = selectedGroup.group[primaryContactIndex];
        if (!primaryContact) {
            toast.error('Primary contact not found');
            return;
        }

        try {
            // Step 1: Update the primary contact in HubSpot if there are field changes
            const fieldsToUpdate: any = {};
            if (updatedPrimaryData.firstName !== primaryContact.firstName) {
                fieldsToUpdate.firstname = updatedPrimaryData.firstName;
            }
            if (updatedPrimaryData.lastName !== primaryContact.lastName) {
                fieldsToUpdate.lastname = updatedPrimaryData.lastName;
            }
            if (updatedPrimaryData.phone !== primaryContact.phone) {
                fieldsToUpdate.phone = updatedPrimaryData.phone;
            }
            if (updatedPrimaryData.company !== primaryContact.company) {
                fieldsToUpdate.company = updatedPrimaryData.company;
            }

            // Handle other properties
            if (updatedPrimaryData.otherProperties) {
                Object.entries(updatedPrimaryData.otherProperties).forEach(([key, value]) => {
                    const currentValue = primaryContact.otherProperties?.[key];
                    if (value !== currentValue) {
                        fieldsToUpdate[key] = value;
                    }
                });
            }

            let updatedContactId = primaryContact.hubspotId;

            if (Object.keys(fieldsToUpdate).length > 0) {
                const updateResponse = await updateContact({
                    contactId: primaryContact.hubspotId,
                    apiKey,
                    fields: fieldsToUpdate
                }) as any;
                // Check if the update returned a new ID
                if (updateResponse?.id) {
                    updatedContactId = updateResponse.id;
                }
                // Update the primary contact info in the UI before merging
                setDuplicates((prevGroups: DuplicateGroup[]) => prevGroups.map((g: DuplicateGroup) => {
                    if (g.id !== selectedGroup.id) return g;
                    const updatedGroup = [...g.group];
                    updatedGroup[primaryContactIndex] = {
                        ...updatedGroup[primaryContactIndex],
                        firstName: updatedPrimaryData.firstName,
                        lastName: updatedPrimaryData.lastName,
                        phone: updatedPrimaryData.phone,
                        company: updatedPrimaryData.company,
                        otherProperties: updatedPrimaryData.otherProperties,
                        hubspotId: updatedContactId,
                    };
                    return { ...g, group: updatedGroup };
                }));
            }

            // Step 2: Perform the merge with the updated/current primary contact
            const secondaryContacts = selectedGroup.group.filter(c => c.id !== selectedContactId);

            // Process each secondary contact individually
            let currentPrimaryId = updatedContactId;

            for (const secondaryContact of secondaryContacts) {
                const mergeData = {
                    groupId: selectedGroup.id,
                    primaryAccountId: currentPrimaryId,
                    secondaryAccountId: secondaryContact.hubspotId, // Single contact, not array
                    apiKey,
                };

                console.log('🔄 SINGLE MERGE - Sending merge request:', mergeData);
                const response = await mergeContacts(mergeData);
                console.log('✅ SINGLE MERGE - Merge response:', response);
                const result = response.data as { success: boolean; message: string; mergeId?: number; details?: any };

                if (result && result.success) {
                    console.log('✅ SINGLE MERGE - Merge successful, result:', result);
                    // Update current primary ID if HubSpot returns a new merged ID
                    if (result.details?.id) {
                        currentPrimaryId = result.details.id;
                    }
                } else {
                    console.error('❌ SINGLE MERGE - Merge failed, result:', result);
                    toast.error('❌ Merge failed. Please try again.');
                    setIsFieldSelectionModalOpen(false);
                    return;
                }
            }

            toast.success(`✅ Successfully merged all contacts in group`);
            // Clear selection for this group using Redux
            dispatch(setSelectedContact({ groupId: selectedGroup.id, contactId: null }));
            // Refresh duplicates list
            await fetchDuplicates(currentPage);
        } catch (error: any) {
            console.error('Error during field selection merge:', error);
            toast.error('❌ Error processing merge. Please try again.\n\nError details: ' + (error?.message || error?.toString()));
        }

        setIsFieldSelectionModalOpen(false);
    };

    const handleFinishProcess = async () => {
        try {
            if (!apiKey) {
                toast.error('Missing API key.');
                return;
            }
            await finishProcess({ apiKey });
            router.push('/dashboard');
        } catch (error) {
            toast.error('❌ Error finishing process. Please try again.');
            console.error('Error finishing process:', error);
        }
    }

    useEffect(() => {
        const showPlanModal =
            !userPlan ||
            (userPlan.planType === 'free' && ((processStatus?.count ?? 0) > freeContactLimit || userPlan.mergeGroupsUsed >= freeMergeGroupLimit)) ||
            (userPlan.planType === 'paid' && userPlan.paymentStatus !== 'active');
        setShowPlanModal(showPlanModal);

    }, [processStatus, userPlan]);

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
        <div className="py-8">
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

            {/* Field Selection Modal */}
            {isFieldSelectionModalOpen && selectedGroup && (
                <FieldSelectionModal
                    isOpen={isFieldSelectionModalOpen}
                    onClose={() => setIsFieldSelectionModalOpen(false)}
                    primaryContact={selectedGroup.group.find(c => c.id === selectedContactForTwoGroup[selectedGroup.id])!}
                    secondaryContacts={selectedGroup.group.filter(c => c.id !== selectedContactForTwoGroup[selectedGroup.id])}
                    onConfirm={handleFieldSelectionConfirm}
                />
            )}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Duplicate Management</h1>
                        <p className="mt-2 text-gray-600">Review and merge duplicate contacts</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
                        {processStatus?.process_name !== "fetching" && <button
                            className="mt-4 sm:mt-0 inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition"
                            onClick={() => setShowPlanModal(true)}
                        >
                            Upgrade Plan
                        </button>}
                        <button
                            className="mt-2 sm:mt-0 inline-block px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded shadow hover:bg-gray-300 transition border border-gray-300"
                            onClick={() => router.push('/dashboard')}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Process Status */}
                <ProcessStatus
                    status={processStatus}
                    onFinish={handleFinishProcess}
                />

                {/* Duplicates List */}
                {processStatus?.process_name === 'manually merge' && (
                    <>
                        {/* Bulk Merge Controls */}
                        {duplicates.length > 0 && (
                            <div className="mb-6 bg-white rounded-lg shadow p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
                                        <div className="text-sm text-gray-600">
                                            {(() => {
                                                const totalSelected = Object.keys(selectedContactForTwoGroup).length;
                                                const currentPageSelected = duplicates.filter(group => selectedContactForTwoGroup[group.id]).length;
                                                return totalSelected > 0
                                                    ? `${totalSelected} group${totalSelected === 1 ? '' : 's'} selected total (${currentPageSelected} on this page)`
                                                    : 'Select primary contacts to enable bulk merge';
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                                            onClick={() => dispatch(clearAllSelections())}
                                            disabled={isBulkMerging || Object.keys(selectedContactForTwoGroup).length === 0}
                                        >
                                            Clear All Selections
                                        </button>
                                        <button
                                            className={`px-4 py-2 text-sm font-semibold rounded transition ${duplicates.filter(group => selectedContactForTwoGroup[group.id]).length === 0 || isBulkMerging
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            onClick={handleBulkMerge}
                                            disabled={duplicates.filter(group => selectedContactForTwoGroup[group.id]).length === 0 || isBulkMerging}
                                        >
                                            {isBulkMerging ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Merging...
                                                </span>
                                            ) : (
                                                `Merge Current Page (${duplicates.filter(group => selectedContactForTwoGroup[group.id]).length})`
                                            )}
                                        </button>
                                        <button
                                            className={`px-6 py-2 text-sm font-semibold rounded transition ${Object.keys(selectedContactForTwoGroup).length === 0 || isBulkMerging
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                }`}
                                            onClick={handleBulkMergeAll}
                                            disabled={Object.keys(selectedContactForTwoGroup).length === 0 || isBulkMerging}
                                        >
                                            {isBulkMerging ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Merging...
                                                </span>
                                            ) : (
                                                `Merge All Selected (${Object.keys(selectedContactForTwoGroup).length})`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DuplicatesList
                            duplicates={duplicates}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => {
                                setCurrentPage(page);
                                fetchDuplicates(page);
                            }}
                            onMergeClick={handleMergeClick}
                            onDirectMergeClick={async (group) => {
                                // Direct merge logic: use exact same logic as handleFieldSelectionConfirm
                                const selectedContactId = selectedContactForTwoGroup[group.id];
                                if (!selectedContactId) {
                                    toast.info('Please select a primary contact before merging.');
                                    return;
                                }
                                const primaryContact = group.group.find(c => c.id === selectedContactId);
                                if (!primaryContact) {
                                    toast.error('Primary contact not found');
                                    return;
                                }
                                const secondaryContacts = group.group.filter(c => c.id !== selectedContactId);

                                try {
                                    // Use same logic as handleFieldSelectionConfirm: process each secondary contact individually
                                    let groupSuccess = true;
                                    let currentPrimaryId = primaryContact.hubspotId;

                                    for (const secondaryContact of secondaryContacts) {
                                        const mergeData = {
                                            groupId: group.id,
                                            primaryAccountId: currentPrimaryId,
                                            secondaryAccountId: secondaryContact.hubspotId, // Single contact like in handleFieldSelectionConfirm
                                            apiKey,
                                        };

                                        const response = await mergeContacts(mergeData);
                                        const result = response.data as { success: boolean; message: string; mergeId?: number; details?: any };

                                        if (result && result.success) {
                                            // Update current primary ID if HubSpot returns a new merged ID
                                            if (result.details?.id) {
                                                currentPrimaryId = result.details.id;
                                            }
                                        } else {
                                            groupSuccess = false;
                                            break;
                                        }
                                    }

                                    if (groupSuccess) {
                                        dispatch(setSelectedContact({ groupId: group.id, contactId: null }));
                                        await fetchDuplicates(currentPage);
                                    } else {
                                        toast.error('❌ Merge failed. Please try again.');
                                    }
                                } catch (error: any) {
                                    console.error('Error during direct merge:', error);
                                    toast.error('❌ Error processing merge. Please try again.\n\nError details: ' + (error?.message || error?.toString()));
                                }
                            }}
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
