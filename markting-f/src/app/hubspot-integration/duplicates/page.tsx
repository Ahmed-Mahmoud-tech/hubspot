'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

// Import components with absolute paths for better module resolution
import DuplicatesList from '@/app/hubspot-integration/duplicates/components/DuplicatesList';
import MergeModal from '@/app/hubspot-integration/duplicates/components/MergeModal';
import ProcessStatus from '@/app/hubspot-integration/duplicates/components/ProcessStatus';
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
    const apiKey = searchParams.get('apiKey') || '';
    const { getDuplicates, submitMerge, resetMerge, finishProcess, getActions, isAuthenticated } = useRequest();
    const router = useRouter();

    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [processStatus, setProcessStatus] = useState<ProcessStatusData | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        setIsModalOpen(true);
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

            const result = await submitMerge({
                ...mergeData,
                apiKey,
            }) as { message: string; details?: any };

            console.log('Merge submitted successfully:', result);

            // Refresh duplicates list
            await fetchDuplicates(currentPage);
            setIsModalOpen(false);
            setSelectedGroup(null);

            // Show detailed success message
            const removedContactsInfo = mergeData.allContactsData
                .filter(contact => mergeData.removedIds.includes(contact.id))
                .map(contact => contact.hubspotId);

            const successMessage = `
✅ Contact merged successfully!

📋 Details:
• Selected Contact: ${mergeData.selectedContactHubspotId}
• Removed ${mergeData.removedIds.length} duplicate contact(s):
  ${removedContactsInfo.map(id => `  - ${id}`).join('\n  ')}
• Updated ${Object.keys(mergeData.updatedData).filter(key => !['recordId', 'hubspotId'].includes(key)).length} field(s):
  ${Object.entries(mergeData.updatedData)
                    .filter(([key]) => !['recordId', 'hubspotId'].includes(key))
                    .map(([field, value]) => `  - ${field}: ${value}`)
                    .join('\n  ')}

${result.details ? `⏰ Merge completed at: ${new Date(result.details.mergeTimestamp).toLocaleString()}` : ''}
            `.trim();

            alert(successMessage);

        } catch (error) {
            console.error('Error submitting merge:', error);
            alert('❌ Error merging contacts. Please try again.\n\nError details: ' + (error as Error).message);
        }
    };

    const handleFinishProcess = async () => {
        try {
            const result = await finishProcess({ apiKey }) as any;
            alert(`Process completed! Excel file: ${result.excelUrl}`);
            // Redirect or refresh
            router.push('/hubspot-integration');
        } catch (error) {
            console.error('Error finishing process:', error);
        }
    };

    const handleResetClick = async (group: DuplicateGroup) => {
        try {
            console.log('Resetting merged group:', group.id);

            const result = await resetMerge({
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

                {/* Duplicates List */}
                {processStatus?.process_name === 'manually merge' && (
                    <>
                        <DuplicatesList
                            duplicates={duplicates}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            onMergeClick={handleMergeClick}
                            onResetClick={handleResetClick}
                            onRefresh={() => fetchDuplicates(currentPage)}
                        />

                        {/* Merge Modal */}
                        <MergeModal
                            isOpen={isModalOpen}
                            group={selectedGroup}
                            onClose={() => {
                                setIsModalOpen(false);
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
