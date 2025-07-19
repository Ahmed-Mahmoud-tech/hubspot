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
    selectedContactForTwoGroup: { [groupId: number]: number | null };
    onContactSelect: (groupId: number, contactId: number) => void;
}

export default function DuplicatesList({
    duplicates,
    currentPage,
    totalPages,
    onPageChange,
    onMergeClick,
    onResetClick,
    onRefresh,
    selectedContactForTwoGroup,
    onContactSelect
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
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-8">
                <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-white"
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
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 All Clear!</h3>
                    <p className="text-lg text-gray-600 mb-8">
                        No duplicate contacts found. All your contacts are unique and organized!
                    </p>
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                        >
                            <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh to Check Again
                        </button>
                        <p className="text-sm text-gray-500">
                            Click refresh to scan for new duplicates or check if any new contacts have been added.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Duplicate Groups</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Found <span className="font-medium text-blue-600">{duplicates.length}</span> duplicate groups to review
                        </p>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transition-all duration-200"
                    >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Duplicates List */}
            <div className="divide-y divide-gray-100">
                {duplicates.map((duplicateGroup, index) => (
                    <div key={duplicateGroup.id} className={`p-6 transition-all duration-200 ${duplicateGroup.merged
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400'
                        : 'hover:bg-gray-50'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center mb-6">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                                            {currentPage > 1 ? (currentPage - 1) * 10 + index + 1 : index + 1}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Duplicate Group
                                            <span className="ml-2 text-sm font-normal text-gray-500">({duplicateGroup.group.length} contacts)</span>
                                        </h3>
                                    </div>
                                    {duplicateGroup.merged && (
                                        <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            MERGED
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2  ">
                                    {duplicateGroup.group.map((contact) => {
                                        const isClickable = duplicateGroup.group.length === 2;
                                        const isSelected = isClickable && selectedContactForTwoGroup[duplicateGroup.id] === contact.id;

                                        return (
                                            <div
                                                key={contact.id}
                                                className={`relative rounded-xl border-2 px-5 py-4 shadow-sm transition-all duration-300 transform hover:scale-105 ${isSelected
                                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg cursor-pointer'
                                                    : isClickable
                                                        ? 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer'
                                                        : 'border-gray-200 bg-white'
                                                    }`}
                                                onClick={isClickable ? () => onContactSelect(duplicateGroup.id, contact.id) : undefined}
                                            >
                                                {/* Selection indicator only for 2-contact groups when selected */}
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2">
                                                        <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-bold shadow-lg">
                                                            ✓
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                            {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                                                        </div>
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {contact.firstName} {contact.lastName}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {contact.email && (
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600">{contact.email}</p>
                                                            </div>
                                                        )}
                                                        {contact.phone && (
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600">{contact.phone}</p>
                                                            </div>
                                                        )}
                                                        {contact.company && (
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600">{contact.company}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-gray-100 space-y-1">
                                                        <p className="text-xs text-gray-400 flex items-center">
                                                            <span className="font-medium">ID:</span>
                                                            <span className="ml-1 font-mono">{contact.hubspotId}</span>
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            <span className="font-medium">Modified:</span> {formatDate(contact.lastModifiedDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="ml-8 flex-shrink-0">
                                {duplicateGroup.merged ? (
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => onResetClick(duplicateGroup)}
                                            className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 transform hover:scale-105"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Reset Merge
                                        </button>
                                        <p className="text-xs text-orange-600 text-center font-medium">
                                            ⚠️ This will undo the merge
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => onMergeClick(duplicateGroup)}
                                            className={`cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${duplicateGroup.group.length === 2 && selectedContactForTwoGroup[duplicateGroup.id]
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-green-500'
                                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500'
                                                }`}
                                        >
                                            {duplicateGroup.group.length === 2 && selectedContactForTwoGroup[duplicateGroup.id] && (
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                            {duplicateGroup.group.length === 2 && !selectedContactForTwoGroup[duplicateGroup.id] && (
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                                </svg>
                                            )}
                                            {duplicateGroup.group.length > 2 && (
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                </svg>
                                            )}
                                            {duplicateGroup.group.length === 2
                                                ? (selectedContactForTwoGroup[duplicateGroup.id] ? 'Merge Selected' : 'Select & Merge')
                                                : 'Select to Merge'
                                            }
                                        </button>
                                        {duplicateGroup.group.length > 2 && (
                                            <p className="text-xs text-blue-600 text-center font-medium">
                                                💡 Choose 2 contacts to merge
                                            </p>
                                        )}
                                        {duplicateGroup.group.length === 2 && !selectedContactForTwoGroup[duplicateGroup.id] && (
                                            <p className="text-xs text-blue-600 text-center font-medium">
                                                👆 Click on a contact to select it
                                            </p>
                                        )}
                                        {duplicateGroup.group.length === 2 && selectedContactForTwoGroup[duplicateGroup.id] && (
                                            <p className="text-xs text-green-600 text-center font-medium">
                                                ✅ Contact selected - ready to merge
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-700">
                                Page <span className="font-bold text-blue-600">{currentPage}</span> of{' '}
                                <span className="font-bold text-blue-600">{totalPages}</span>
                            </p>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg transition-all duration-200 ${pageNum === currentPage
                                            ? 'z-10 bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-500 text-white shadow-lg'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
