'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

export default function EditContactPage() {
    const searchParams = useSearchParams();
    const { isAuthenticated } = useRequest();
    const [isLoading, setIsLoading] = useState(false);
    const [resultMessage, setResultMessage] = useState('');

    // Example contact data - in real app this would come from your backend
    const [contactData, setContactData] = useState({
        selectedContactId: 1,
        selectedContactHubspotId: '12345',
        groupId: 1,
        apiKey: searchParams?.get('apiKey') || '',
        updatedData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com, john.doe.work@company.com', // Multiple emails
            phone: '+1234567890',
            company: 'Example Corp'
        },
        removedIds: [2, 3], // IDs of contacts to be removed/merged
        allContactsData: [
            { id: 1, hubspotId: '12345', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
            { id: 2, hubspotId: '23456', firstName: 'John', lastName: 'Doe', email: 'john.doe.work@company.com' },
            { id: 3, hubspotId: '34567', firstName: 'J', lastName: 'Doe', email: 'j.doe@example.com' }
        ],
        updateHubSpot: true
    });

    // Check authentication on component mount
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
    }, [isAuthenticated]);

    const handleTestMerge = async () => {
        setIsLoading(true);
        setResultMessage('');

        try {
            const response = await fetch('http://localhost:8000/hubspot/submit-merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(contactData),
            });

            const result = await response.json();

            if (response.ok) {
                setResultMessage(`✅ Success: ${result.message}`);
                console.log('Merge details:', result.details);

                // Display HubSpot operation results
                if (result.details?.hubspotOperations) {
                    const operations = result.details.hubspotOperations;
                    let hubspotMsg = '';

                    if (operations.updateResult?.success) {
                        hubspotMsg += '✅ Contact updated in HubSpot successfully\\n';
                    } else if (operations.updateResult?.error) {
                        hubspotMsg += `❌ Failed to update contact in HubSpot: ${operations.updateResult.error}\\n`;
                    }

                    operations.deleteResults?.forEach((deleteResult: any) => {
                        if (deleteResult.success) {
                            hubspotMsg += `✅ Contact ${deleteResult.hubspotId} deleted from HubSpot\\n`;
                        } else {
                            hubspotMsg += `❌ Failed to delete contact ${deleteResult.hubspotId}: ${deleteResult.error}\\n`;
                        }
                    });

                    if (hubspotMsg) {
                        setResultMessage(prev => prev + '\\n\\nHubSpot Operations:\\n' + hubspotMsg);
                    }
                }
            } else {
                setResultMessage(`❌ Error: ${result.message || 'Failed to merge contacts'}`);
            }
        } catch (error: any) {
            console.error('Error submitting merge:', error);
            setResultMessage(`❌ Network Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        if (field.startsWith('updatedData.')) {
            const dataField = field.replace('updatedData.', '');
            setContactData(prev => ({
                ...prev,
                updatedData: {
                    ...prev.updatedData,
                    [dataField]: value
                }
            }));
        } else {
            setContactData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-6">HubSpot Contact Editing Demo</h1>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-800">About this demo:</h3>
                <p className="text-blue-700 text-sm mt-1">
                    This page demonstrates editing a HubSpot contact with multiple emails.
                    When merged, the primary email will be set in HubSpot&apos;s main email field,
                    and additional emails will be stored in secondary_email and tertiary_email fields.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Contact Data Form */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Contact Information</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                HubSpot Contact ID
                            </label>
                            <input
                                type="text"
                                value={contactData.selectedContactHubspotId}
                                onChange={(e) => handleInputChange('selectedContactHubspotId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter HubSpot contact ID"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                First Name
                            </label>
                            <input
                                type="text"
                                value={contactData.updatedData.firstName}
                                onChange={(e) => handleInputChange('updatedData.firstName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={contactData.updatedData.lastName}
                                onChange={(e) => handleInputChange('updatedData.lastName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Emails (comma-separated for multiple)
                            </label>
                            <textarea
                                value={contactData.updatedData.email}
                                onChange={(e) => handleInputChange('updatedData.email', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="email1@example.com, email2@example.com"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Separate multiple emails with commas. First email becomes primary.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="text"
                                value={contactData.updatedData.phone}
                                onChange={(e) => handleInputChange('updatedData.phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Company
                            </label>
                            <input
                                type="text"
                                value={contactData.updatedData.company}
                                onChange={(e) => handleInputChange('updatedData.company', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Configuration */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Configuration</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={contactData.apiKey}
                                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="HubSpot API Key"
                            />
                        </div>

                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={contactData.updateHubSpot}
                                    onChange={(e) => handleInputChange('updateHubSpot', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Update contact in HubSpot
                                </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                When enabled, the contact will be updated in HubSpot via API
                            </p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded border">
                            <h4 className="font-medium text-gray-700 mb-2">Duplicate Contacts (to remove):</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                {contactData.allContactsData.slice(1).map((contact) => (
                                    <li key={contact.id}>
                                        • ID {contact.id} (HubSpot: {contact.hubspotId}) - {contact.email}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col space-y-4">
                <button
                    onClick={handleTestMerge}
                    disabled={isLoading || !contactData.apiKey}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {isLoading ? 'Processing Merge...' : 'Test Contact Merge with HubSpot Update'}
                </button>

                {/* Results */}
                {resultMessage && (
                    <div className={`p-4 rounded border ${resultMessage.includes('✅')
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                            {resultMessage}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
