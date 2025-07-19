'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';
import { baseURL } from '@/app/constant/main';
import HubSpotForm from '../components/HubSpotForm';
import { getCookie } from 'cookies-next';

interface Action {
    id: number;
    name: string;
    process_name: string;
    status: string;
    count: number;
    api_key: string;
    excel_link?: string;
    created_at: string;
}

export default function HubSpotDashboard() {
    const router = useRouter();
    const { getActions, isAuthenticated } = useRequest();
    const [actions, setActions] = useState<Action[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    // Check authentication on component mount
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
    }, [isAuthenticated]);

    const fetchActions = useCallback(async () => {
        try {
            const data = await getActions() as Action[];
            setActions(data);
        } catch (error) {
            console.error('Error fetching actions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const testDuplicateDetection = async (apiKey: string) => {
        setTestLoading(true);
        setTestResult(null);

        try {
            const token = getCookie('auth_token');
            const response = await fetch(`${baseURL}/hubspot/test-find-duplicates?apiKey=${encodeURIComponent(apiKey)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();
            setTestResult(result);

            if (result.success) {
                // Refresh actions list to show updated data
                await fetchActions();
            }
        } catch (error) {
            console.error('Test failed:', error);
            setTestResult({
                success: false,
                message: 'Test request failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setTestLoading(false);
        }
    };

    useEffect(() => {
        fetchActions();

        // Poll for updates every 10 seconds
        const interval = setInterval(fetchActions, 10000);
        return () => clearInterval(interval);
    }, [fetchActions]);

    const getStatusColor = (processName: string) => {
        switch (processName) {
            case 'fetching':
                return 'bg-blue-100 text-blue-800';
            case 'filtering':
                return 'bg-yellow-100 text-yellow-800';
            case 'manually merge':
                return 'bg-green-100 text-green-800';
            case 'update hubspot':
                return 'bg-purple-100 text-purple-800';
            case 'finished':
                return 'bg-gray-100 text-gray-800';
            case 'error':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">HubSpot Integration Dashboard</h1>
                            <p className="mt-2 text-gray-600">Manage your HubSpot duplicate detection processes</p>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            {showForm ? 'Cancel' : 'New Integration'}
                        </button>
                    </div>
                </div>

                {/* New Integration Form */}
                {showForm && (
                    <div className="mb-8">
                        <HubSpotForm />
                    </div>
                )}

                {/* Test Duplicate Detection Section */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-medium text-yellow-800">Test Duplicate Detection</h3>
                            <p className="text-sm text-yellow-700">Test the duplicate detection functionality with existing data</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* API Key input and test button */}
                        <div className="flex items-end space-x-4">
                            <div className="flex-1">
                                <label htmlFor="test-api-key" className="block text-sm font-medium text-gray-700 mb-1">
                                    API Key to Test
                                </label>
                                <input
                                    type="text"
                                    id="test-api-key"
                                    placeholder="Enter HubSpot API key..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const input = document.getElementById('test-api-key') as HTMLInputElement;
                                    if (input.value.trim()) {
                                        testDuplicateDetection(input.value.trim());
                                    }
                                }}
                                disabled={testLoading}
                                className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {testLoading ? 'Testing...' : 'Test Detection'}
                            </button>
                        </div>

                        {/* Test Result Display */}
                        {testResult && (
                            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
                                <div className="flex items-center">
                                    <div className={`flex-shrink-0 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {testResult.success ? (
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="ml-3">
                                        <h3 className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {testResult.message}
                                        </h3>
                                        {testResult.success && testResult.totalGroups !== undefined && (
                                            <div className="text-sm text-green-700 mt-1">
                                                Found {testResult.totalGroups} duplicate groups
                                            </div>
                                        )}
                                        {!testResult.success && testResult.error && (
                                            <div className="text-sm text-red-700 mt-1">
                                                Error: {testResult.error}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {testResult.success && testResult.groups && testResult.groups.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-green-800 mb-2">Sample Groups:</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {testResult.groups.slice(0, 5).map((group: any, index: number) => (
                                                <div key={group.id} className="text-xs bg-white p-2 rounded border">
                                                    <span className="font-medium">Group {index + 1}:</span> {group.groupSize} contacts (IDs: {group.contactIds.slice(0, 3).join(', ')}{group.contactIds.length > 3 ? '...' : ''})
                                                </div>
                                            ))}
                                            {testResult.groups.length > 5 && (
                                                <div className="text-xs text-green-600">
                                                    ... and {testResult.groups.length - 5} more groups
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Recent Integrations</h2>
                    </div>

                    {actions.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Get started by creating a new HubSpot integration.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {actions.map((action) => (
                                <div key={action.id} className="px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-4">
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-900">{action.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        Created: {new Date(action.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(action.process_name)}`}>
                                                    {action.process_name}
                                                </div>
                                                {action.count > 0 && (
                                                    <div className="text-sm text-gray-600">
                                                        {action.count} contacts
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            {/* Test Button for all actions */}
                                            <button
                                                onClick={() => testDuplicateDetection(action.api_key)}
                                                disabled={testLoading}
                                                className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
                                                title="Test duplicate detection"
                                            >
                                                {testLoading ? 'Testing...' : 'Test'}
                                            </button>

                                            {action.process_name === 'manually merge' && (
                                                <button
                                                    onClick={() => router.push(`/hubspot-integration/duplicates?apiKey=${encodeURIComponent(action.api_key)}`)}
                                                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                                >
                                                    Review Duplicates
                                                </button>
                                            )}                            {action.process_name === 'finished' && action.excel_link && (
                                                <a
                                                    href={`${baseURL}${action.excel_link}`}
                                                    download
                                                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                >
                                                    Download CSV
                                                </a>
                                            )}

                                            {['fetching', 'filtering', 'update hubspot'].includes(action.process_name) && (
                                                <div className="text-sm text-gray-500">
                                                    Processing...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
