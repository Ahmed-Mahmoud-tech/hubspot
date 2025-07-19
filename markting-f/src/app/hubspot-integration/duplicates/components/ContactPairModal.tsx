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

interface DuplicateGroup {
    id: number;
    group: Contact[];
}

interface ContactPairModalProps {
    isOpen: boolean;
    group: DuplicateGroup | null;
    onClose: () => void;
    onMergePair: (contact1: Contact, contact2: Contact) => void;
    onRemoveContact: (contact: Contact) => void;
}

export default function ContactPairModal({
    isOpen,
    group,
    onClose,
    onMergePair,
    onRemoveContact
}: ContactPairModalProps) {
    const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);

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
        if (group && group.group.length > 0) {
            setContacts([...group.group]);
            setSelectedContacts([]);
        }
    }, [group]);

    if (!isOpen || !group) return null;

    const handleContactSelect = (contact: Contact) => {
        setSelectedContacts(prev => {
            const isSelected = prev.some(c => c.id === contact.id);
            if (isSelected) {
                return prev.filter(c => c.id !== contact.id);
            } else if (prev.length < 2) {
                return [...prev, contact];
            } else {
                // Replace the first selected contact with the new one
                return [prev[1], contact];
            }
        });
    };

    const handleMergePair = () => {
        if (selectedContacts.length === 2) {
            onMergePair(selectedContacts[0], selectedContacts[1]);
        }
    };

    const handleRemoveContact = (contact: Contact) => {
        if (window.confirm(`Are you sure you want to remove contact ${contact.firstName} ${contact.lastName} (${contact.hubspotId})?`)) {
            onRemoveContact(contact);
            // Remove from local state
            setContacts(prev => prev.filter(c => c.id !== contact.id));
            setSelectedContacts(prev => prev.filter(c => c.id !== contact.id));
        }
    };

    const canMerge = selectedContacts.length === 2;
    const showInstructions = contacts.length > 2;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Manage Duplicate Group ({contacts.length} contacts)
                            </h3>
                            {showInstructions && (
                                <p className="mt-1 text-sm text-gray-600">
                                    HubSpot can only merge 2 contacts at a time. Select 2 contacts to merge, or remove unwanted contacts.
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Selection Status */}
                    {selectedContacts.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                                Selected {selectedContacts.length} of 2 contacts for merging:
                                {selectedContacts.map((contact, index) => (
                                    <span key={contact.id} className="ml-1 font-medium">
                                        {contact.firstName} {contact.lastName}
                                        {index < selectedContacts.length - 1 && ', '}
                                    </span>
                                ))}
                            </p>
                        </div>
                    )}

                    {/* Contacts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {contacts.map((contact) => {
                            const isSelected = selectedContacts.some(c => c.id === contact.id);
                            return (
                                <div
                                    key={contact.id}
                                    className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${isSelected
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                                        }`}
                                    onClick={() => handleContactSelect(contact)}
                                >
                                    {/* Selection Indicator */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2">
                                            <div className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                                                {selectedContacts.findIndex(c => c.id === contact.id) + 1}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between">
                                            <h4 className="text-sm font-medium text-gray-900">
                                                {contact.firstName} {contact.lastName}
                                            </h4>
                                        </div>

                                        {contact.email && (
                                            <p className="text-sm text-gray-600">{contact.email}</p>
                                        )}

                                        {contact.phone && (
                                            <p className="text-sm text-gray-600">{contact.phone}</p>
                                        )}

                                        {contact.company && (
                                            <p className="text-sm text-gray-600">{contact.company}</p>
                                        )}

                                        <div className="text-xs text-gray-400 space-y-1">
                                            <p>HubSpot ID: {contact.hubspotId}</p>
                                            <p>Last Modified: {formatDate(contact.lastModifiedDate)}</p>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveContact(contact);
                                        }}
                                        className="absolute bottom-2 right-2 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                                        title="Remove this contact"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* No contacts left */}
                    {contacts.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">All contacts have been removed from this group.</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                            {contacts.length === 1 ? (
                                "Only one contact remains - no merge needed"
                            ) : contacts.length === 2 ? (
                                "Select both contacts to merge them"
                            ) : (
                                `${contacts.length} contacts remaining`
                            )}
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Close
                            </button>

                            {contacts.length >= 2 && (
                                <button
                                    type="button"
                                    onClick={handleMergePair}
                                    disabled={!canMerge}
                                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${canMerge
                                            ? 'text-white bg-blue-600 hover:bg-blue-700'
                                            : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                        }`}
                                >
                                    Merge Selected ({selectedContacts.length}/2)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
