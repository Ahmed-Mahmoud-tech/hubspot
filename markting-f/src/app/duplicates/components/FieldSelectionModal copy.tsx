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
    hs_additional_emails?: string;
}

interface FieldData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
}

interface FieldSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    primaryContact: Contact;
    secondaryContacts: Contact[];
    onConfirm: (updatedPrimaryData: FieldData) => void;
}

export default function FieldSelectionModal({
    isOpen,
    onClose,
    primaryContact,
    secondaryContacts,
    onConfirm,
}: FieldSelectionModalProps) {
    const [selectedFields, setSelectedFields] = useState<FieldData>({
        firstName: primaryContact.firstName || '',
        lastName: primaryContact.lastName || '',
        phone: primaryContact.phone || '',
        company: primaryContact.company || '',
    });

    // Reset form when modal opens with new data
    useEffect(() => {
        if (isOpen) {
            setSelectedFields({
                firstName: primaryContact.firstName || '',
                lastName: primaryContact.lastName || '',
                phone: primaryContact.phone || '',
                company: primaryContact.company || '',
            });
        }
    }, [isOpen, primaryContact]);

    if (!isOpen) return null;

    const handleFieldChange = (field: keyof FieldData, value: string) => {
        setSelectedFields(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleConfirm = () => {
        onConfirm(selectedFields);
        onClose();
    };


    // All contacts for card display
    const allContacts = [primaryContact, ...secondaryContacts];

    // Get all unique values for each field from all contacts
    const getAllFieldOptions = (field: keyof Omit<Contact, 'id' | 'hubspotId' | 'lastModifiedDate' | 'email' | 'hs_additional_emails'>) => {
        const values = allContacts
            .map(contact => contact[field])
            .filter(value => value && value.toString().trim())
            .filter((value, index, arr) => arr.indexOf(value) === index); // Remove duplicates
        return values as string[];
    };

    // Helper to select a value from a card
    const handleCardFieldClick = (field: keyof FieldData, value: string) => {
        setSelectedFields(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Select Contact Fields
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Choose the values for each field from the available options, or click a value in any card below. Email fields cannot be modified.
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="flex flex-wrap gap-4 px-6 py-4 justify-center">
                    {allContacts.map((contact, idx) => (
                        <div
                            key={contact.id}
                            className={`rounded-xl border-2 px-5 py-4 shadow-sm bg-gradient-to-br from-gray-50 to-blue-50 min-w-[220px] max-w-xs flex-1 transition-all duration-300 ${contact.id === primaryContact.id ? 'border-blue-600' : 'border-gray-200'} `}
                        >
                            <div className="flex items-center mb-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                                    {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {contact.firstName} {contact.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono">ID: {contact.hubspotId}</div>
                                </div>
                            </div>
                            <div className="space-y-1 mt-2">
                                <div className="flex items-center text-sm">
                                    <span className="font-medium w-20">Email:</span>
                                    <span className="truncate text-gray-700">{contact.email || <span className="italic text-gray-400">N/A</span>}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="font-medium w-20">First Name:</span>
                                    <span
                                        className={`cursor-pointer px-1 rounded ${selectedFields.firstName === contact.firstName ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-blue-50'}`}
                                        onClick={() => contact.firstName && handleCardFieldClick('firstName', contact.firstName)}
                                    >
                                        {contact.firstName || <span className="italic text-gray-400">N/A</span>}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="font-medium w-20">Last Name:</span>
                                    <span
                                        className={`cursor-pointer px-1 rounded ${selectedFields.lastName === contact.lastName ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-blue-50'}`}
                                        onClick={() => contact.lastName && handleCardFieldClick('lastName', contact.lastName)}
                                    >
                                        {contact.lastName || <span className="italic text-gray-400">N/A</span>}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="font-medium w-20">Phone:</span>
                                    <span
                                        className={`cursor-pointer px-1 rounded ${selectedFields.phone === contact.phone ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-blue-50'}`}
                                        onClick={() => contact.phone && handleCardFieldClick('phone', contact.phone)}
                                    >
                                        {contact.phone || <span className="italic text-gray-400">N/A</span>}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="font-medium w-20">Company:</span>
                                    <span
                                        className={`cursor-pointer px-1 rounded ${selectedFields.company === contact.company ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-blue-50'}`}
                                        onClick={() => contact.company && handleCardFieldClick('company', contact.company)}
                                    >
                                        {contact.company || <span className="italic text-gray-400">N/A</span>}
                                    </span>
                                </div>
                                {contact.hs_additional_emails && (
                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <span className="font-medium w-20">Add. Emails:</span>
                                        <span className="truncate">{contact.hs_additional_emails}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Field Selection Area */}
                <div className="px-6 py-4 space-y-6 bg-gray-50 border-t border-b border-gray-200">
                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name
                        </label>
                        <div className="space-y-2">
                            {getAllFieldOptions('firstName').map((option, index) => (
                                <label key={index} className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="firstName"
                                        value={option}
                                        checked={selectedFields.firstName === option}
                                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                        className="mr-2 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                </label>
                            ))}
                            <div className="flex items-center mt-1">
                                <input
                                    type="radio"
                                    name="firstName"
                                    value=""
                                    checked={!getAllFieldOptions('firstName').includes(selectedFields.firstName || '')}
                                    onChange={() => {}}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Enter custom first name"
                                    value={getAllFieldOptions('firstName').includes(selectedFields.firstName || '') ? '' : selectedFields.firstName}
                                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name
                        </label>
                        <div className="space-y-2">
                            {getAllFieldOptions('lastName').map((option, index) => (
                                <label key={index} className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="lastName"
                                        value={option}
                                        checked={selectedFields.lastName === option}
                                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                        className="mr-2 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                </label>
                            ))}
                            <div className="flex items-center mt-1">
                                <input
                                    type="radio"
                                    name="lastName"
                                    value=""
                                    checked={!getAllFieldOptions('lastName').includes(selectedFields.lastName || '')}
                                    onChange={() => {}}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Enter custom last name"
                                    value={getAllFieldOptions('lastName').includes(selectedFields.lastName || '') ? '' : selectedFields.lastName}
                                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                        </label>
                        <div className="space-y-2">
                            {getAllFieldOptions('phone').map((option, index) => (
                                <label key={index} className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="phone"
                                        value={option}
                                        checked={selectedFields.phone === option}
                                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                                        className="mr-2 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                </label>
                            ))}
                            <div className="flex items-center mt-1">
                                <input
                                    type="radio"
                                    name="phone"
                                    value=""
                                    checked={!getAllFieldOptions('phone').includes(selectedFields.phone || '')}
                                    onChange={() => {}}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Enter custom phone"
                                    value={getAllFieldOptions('phone').includes(selectedFields.phone || '') ? '' : selectedFields.phone}
                                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company
                        </label>
                        <div className="space-y-2">
                            {getAllFieldOptions('company').map((option, index) => (
                                <label key={index} className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="company"
                                        value={option}
                                        checked={selectedFields.company === option}
                                        onChange={(e) => handleFieldChange('company', e.target.value)}
                                        className="mr-2 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                </label>
                            ))}
                            <div className="flex items-center mt-1">
                                <input
                                    type="radio"
                                    name="company"
                                    value=""
                                    checked={!getAllFieldOptions('company').includes(selectedFields.company || '')}
                                    onChange={() => {}}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Enter custom company"
                                    value={getAllFieldOptions('company').includes(selectedFields.company || '') ? '' : selectedFields.company}
                                    onChange={(e) => handleFieldChange('company', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Proceed with Merge
                    </button>
                </div>
            </div>
        </div>
    );
}
