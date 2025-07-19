'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import useRequest from '../axios/useRequest';
import { ArrowLeft, Key, User, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const hubspotIntegrationSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    apiKey: z.string().min(1, 'HubSpot API Key is required').min(10, 'API Key seems too short'),
});

type HubSpotIntegrationData = z.infer<typeof hubspotIntegrationSchema>;

export default function HubSpotIntegrationPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { startHubSpotFetch, isAuthenticated } = useRequest();

    // Check authentication on component mount
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
    }, [isAuthenticated]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<HubSpotIntegrationData>({
        resolver: zodResolver(hubspotIntegrationSchema),
    });

    const onSubmit = async (data: HubSpotIntegrationData) => {
        setIsLoading(true);
        try {
            const result = await startHubSpotFetch(data);
            toast.success(result.message);
            reset();
            // Redirect to dashboard
            router.push('/hubspot-integration/dashboard');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to start HubSpot integration';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto space-y-8">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Dashboard
                    </button>

                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        HubSpot Integration
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Connect your HubSpot account to start managing duplicate contacts
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        {/* Quick Actions */}
                        <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => router.push('/hubspot-integration/dashboard')}
                                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                >
                                    → View Dashboard
                                </button>
                            </div>
                        </div>
                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Integration Name
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('name')}
                                    type="text"
                                    placeholder="e.g., Production Contacts Sync"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        {/* API Key Field */}
                        <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                                HubSpot API Key
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('apiKey')}
                                    type="password"
                                    placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            {errors.apiKey && (
                                <p className="mt-1 text-sm text-red-600">{errors.apiKey.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                You can find your API key in HubSpot Settings → Integrations → Private Apps
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    What happens next?
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>We&apos;ll fetch all contacts from your HubSpot account</li>
                                        <li>The system will analyze and identify potential duplicates</li>
                                        <li>You&apos;ll be able to review and merge duplicate contacts</li>
                                        <li>This process may take a few minutes depending on your contact count</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Starting Integration...
                                </>
                            ) : (
                                <>
                                    Start HubSpot Integration
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
