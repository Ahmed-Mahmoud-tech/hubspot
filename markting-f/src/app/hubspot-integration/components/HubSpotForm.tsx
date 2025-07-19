'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useRequest from '@/app/axios/useRequest';

export default function HubSpotForm() {
    const router = useRouter();
    const { startHubSpotFetch, isAuthenticated } = useRequest();
    const [formData, setFormData] = useState({
        name: '',
        apiKey: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    // Check authentication on component mount
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
    }, [isAuthenticated]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await startHubSpotFetch(formData);
            alert(result.message);
            router.push(`/hubspot-integration/duplicates?apiKey=${encodeURIComponent(formData.apiKey)}`);
        } catch (error: any) {
            console.error('Error starting HubSpot integration:', error);
            alert(error?.response?.data?.message || 'Failed to start HubSpot integration');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Start HubSpot Integration</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Integration Name
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Production Contacts Sync"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        HubSpot API Key
                    </label>
                    <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Starting...' : 'Start Integration'}
                </button>
            </form>
        </div>
    );
}
