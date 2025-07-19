'use client';

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

interface DuplicatesListProps {
    duplicates: DuplicateGroup[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onMergeClick: (group: DuplicateGroup) => void;
    onResetClick: (group: DuplicateGroup) => void;
    onRefresh: () => void;
}

export default function DuplicatesList({
    duplicates,
    currentPage,
    totalPages,
    onPageChange,
    onMergeClick,
    onResetClick,
    onRefresh
}: DuplicatesListProps) {
    // Helper function to format date
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'Not available';
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) return 'Invalid date';
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (duplicates.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No duplicates found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        All contacts have been processed or no duplicates exist.
                    </p>
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Duplicate Groups</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Found {duplicates.length} duplicate groups to review
                        </p>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Duplicates List */}
            <div className="divide-y divide-gray-200">
                {duplicates.map((duplicateGroup, index) => (
                    <div key={duplicateGroup.id} className={`p-6 ${duplicateGroup.merged ? 'bg-gray-50' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">
                                        Group {currentPage > 1 ? (currentPage - 1) * 10 + index + 1 : index + 1}
                                        <span className="ml-2 text-gray-500">({duplicateGroup.group.length} contacts)</span>
                                    </h3>
                                    {duplicateGroup.merged && (
                                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            MERGED
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {duplicateGroup.group.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="relative rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:outline-none"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {contact.firstName} {contact.lastName}
                                                </p>
                                                {contact.email && (
                                                    <p className="text-sm text-gray-500">{contact.email}</p>
                                                )}
                                                {contact.phone && (
                                                    <p className="text-sm text-gray-500">{contact.phone}</p>
                                                )}
                                                {contact.company && (
                                                    <p className="text-sm text-gray-500">{contact.company}</p>
                                                )}
                                                <div className="space-y-1">
                                                    <p className="text-xs text-gray-400">HubSpot ID: {contact.hubspotId}</p>
                                                    <p className="text-xs text-gray-400">Last Modified: {formatDate(contact.lastModifiedDate)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="ml-6 flex-shrink-0">
                                {duplicateGroup.merged ? (
                                    <button
                                        onClick={() => onResetClick(duplicateGroup)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                    >
                                        Reset
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onMergeClick(duplicateGroup)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Merge
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <p className="text-sm text-gray-700">
                                Page <span className="font-medium">{currentPage}</span> of{' '}
                                <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Previous</span>
                                <svg
                                    className="h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${pageNum === currentPage
                                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Next</span>
                                <svg
                                    className="h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
