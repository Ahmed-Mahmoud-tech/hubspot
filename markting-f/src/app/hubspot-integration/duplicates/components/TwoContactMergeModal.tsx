'use client';

import { useState, useEffect } from 'react';

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

interface TwoContactMergeModalProps {
    isOpen: boolean;
    contact1: Contact | null;
    contact2: Contact | null;
    groupId: number;
    onClose: () => void;
    onSubmit: (mergeData: {
        groupId: number;
        selectedContactId: number;
        selectedContactHubspotId: string;
        updatedData: Record<string, string>;
        removedIds: number[];
        allContactsData: Contact[];
    }) => void;
}

export default function TwoContactMergeModal({
    isOpen,
    contact1,
    contact2,
    groupId,
    onClose,
    onSubmit
}: TwoContactMergeModalProps) {
    const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

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

    useEffect(() => {
        // Reset selection when modal opens with new contacts
        setSelectedContactId(null);
    }, [contact1, contact2]);

    if (!isOpen || !contact1 || !contact2) return null;

    const contacts = [contact1, contact2];

    const handleContactSelect = (contactId: number) => {
        setSelectedContactId(contactId);
    };

    const handleSubmit = () => {
        if (!selectedContactId) {
            alert('Please select which contact to keep');
            return;
        }

        const selectedContact = contacts.find(c => c.id === selectedContactId);
        const removedContact = contacts.find(c => c.id !== selectedContactId);

        if (!selectedContact || !removedContact) {
            alert('Error: Could not identify contacts');
            return;
        }

        const submitData = {
            groupId,
            selectedContactId: selectedContact.id,
            selectedContactHubspotId: selectedContact.hubspotId,
            updatedData: {
                recordId: selectedContact.id.toString(),
                hubspotId: selectedContact.hubspotId,
                firstName: selectedContact.firstName || '',
                lastName: selectedContact.lastName || '',
                email: selectedContact.email || '',
                phone: selectedContact.phone || '',
                company: selectedContact.company || '',
            },
            removedIds: [removedContact.id],
            allContactsData: contacts,
        };

        onSubmit(submitData);
    };

    const renderContactCard = (contact: Contact) => {
        const isSelected = selectedContactId === contact.id;
        return (
            <div
                key={contact.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                    }`}
                onClick={() => handleContactSelect(contact.id)}
            >
                {/* Selection indicator */}
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                    </h4>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-gray-100 border-gray-300'
                        }`}>
                        {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                </div>

                <div className="space-y-2 text-sm">
                    {contact.email && (
                        <p className="text-gray-600">
                            <span className="font-medium">Email:</span> {contact.email}
                        </p>
                    )}
                    {contact.phone && (
                        <p className="text-gray-600">
                            <span className="font-medium">Phone:</span> {contact.phone}
                        </p>
                    )}
                    {contact.company && (
                        <p className="text-gray-600">
                            <span className="font-medium">Company:</span> {contact.company}
                        </p>
                    )}
                    <p className="text-xs text-gray-400">
                        HubSpot ID: {contact.hubspotId}
                    </p>
                    <p className="text-xs text-gray-400">
                        Last Modified: {formatDate(contact.lastModifiedDate)}
                    </p>
                </div>

                <div className="mt-3 text-sm font-medium">
                    {isSelected ? (
                        <div className="text-blue-600">
                            ✓ Selected to keep
                        </div>
                    ) : (
                        <div className="text-gray-500">
                            Click to select
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-5xl shadow-lg rounded-md bg-white">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-medium text-gray-900">
                            Merge Two Contacts
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p className="text-sm text-blue-800">
                            Select which contact to keep. The selected contact will be kept with all its original data.
                            The non-selected contact will be removed from HubSpot.
                        </p>
                    </div>

                    {/* Contact Selection */}
                    <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                            Choose which contact to keep
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderContactCard(contact1)}
                            {renderContactCard(contact2)}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!selectedContactId}
                            className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${selectedContactId
                                ? 'text-white bg-blue-600 hover:bg-blue-700'
                                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                }`}
                        >
                            Merge Contacts
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
