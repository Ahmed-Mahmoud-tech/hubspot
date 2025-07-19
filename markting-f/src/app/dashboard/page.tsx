'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie, deleteCookie } from 'cookies-next';
import { toast } from 'react-toastify';
import useRequest, { type User } from '@/app/axios/useRequest';
import { LogOut, User as UserIcon, Settings, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { getProfile } = useRequest();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = getCookie('auth_token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const userProfile = await getProfile();
                setUser(userProfile);
            } catch (error) {
                console.error('Failed to get user profile:', error);
                // Clear cookies and redirect to login
                deleteCookie('auth_token');
                deleteCookie('user');
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const handleLogout = () => {
        deleteCookie('auth_token');
        deleteCookie('user');
        toast.success('Logged out successfully');
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <BarChart3 className="h-8 w-8 text-indigo-600 mr-3" />
                            <h1 className="text-xl font-semibold text-gray-900">
                                HubSpot Duplicate Management
                            </h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <UserIcon className="h-5 w-5 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                    {user.first_name} {user.last_name}
                                </span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <LogOut className="h-4 w-4 mr-1" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Welcome Section */}
                <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
                    <div className="px-6 py-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Welcome back, {user.first_name}!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Manage your HubSpot duplicate contacts and streamline your CRM data.
                            </p>

                            {/* Email Verification Notice */}
                            {!user.verified && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                                    <div className="flex items-center justify-center">
                                        <div className="text-sm text-yellow-800">
                                            <strong>Email verification required:</strong> Please check your email ({user.email}) and click the verification link to activate all features.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Settings className="h-8 w-8 text-indigo-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        HubSpot Integration
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Connect your HubSpot account to start managing duplicates
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={() => router.push('/hubspot-integration')}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                                >
                                    Connect HubSpot
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <BarChart3 className="h-8 w-8 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Duplicate Detection
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Automatically identify duplicate contacts in your CRM
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button className="w-full bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-md cursor-not-allowed">
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <UserIcon className="h-8 w-8 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Merge Management
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Manually review and merge duplicate contacts
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button className="w-full bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-md cursor-not-allowed">
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Info */}
                <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
                    </div>
                    <div className="px-6 py-4">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Name</dt>
                                <dd className="text-sm text-gray-900">{user.first_name} {user.last_name}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Email</dt>
                                <dd className="text-sm text-gray-900">{user.email}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                <dd className="text-sm text-gray-900">{user.phone || 'Not provided'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Account Status</dt>
                                <dd className="text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.verified
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {user.verified ? 'Verified' : 'Pending Verification'}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </main>
        </div>
    );
}
