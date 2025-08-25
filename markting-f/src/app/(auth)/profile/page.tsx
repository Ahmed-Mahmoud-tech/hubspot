'use client';

import { useEffect, useState } from 'react';
import useRequest, { type User } from '@/app/axios/useRequest';
import { PlanModal } from '@/app/plan';
import { useRouter } from 'next/navigation';
import { getCookie, deleteCookie } from 'cookies-next';
import { toast } from 'react-toastify';

export default function ProfilePage() {
    const router = useRouter();
    const { getProfile, getUserPlan, getUserPayments } = useRequest();

    const [user, setUser] = useState<User | null>(null);
    const [plan, setPlan] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);

    // Payments pagination
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalPayments, setTotalPayments] = useState(0);
    const itemsPerPage = 10;

    const checkAuth = async () => {
        try {
            const token = getCookie('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            const userProfile = await getProfile();
            setUser(userProfile);

            try {
                const planDetails = await getUserPlan();
                setPlan(planDetails);
            } catch {
                setPlan(null);
            }
        } catch (error) {
            console.error('Failed to get user profile:', error);
            deleteCookie('auth_token');
            deleteCookie('user');
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPayments = async (page = 1) => {
        try {
            setPaymentsLoading(true);
            const res: any = await getUserPayments({ page, limit: itemsPerPage });
            if (res && res.data) {
                setPayments(res.data as any[]);
                if (res.pagination) {
                    setCurrentPage(res.pagination.page);
                    setTotalPages(res.pagination.totalPages);
                    setTotalPayments(res.pagination.total);
                } else {
                    setCurrentPage(1);
                    setTotalPages(1);
                    setTotalPayments((res.data && res.data.length) || 0);
                }
            } else if (Array.isArray(res)) {
                setPayments(res as any[]);
                setCurrentPage(1);
                setTotalPages(1);
                setTotalPayments(res.length);
            } else {
                setPayments([]);
                setCurrentPage(1);
                setTotalPages(1);
                setTotalPayments(0);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to load payment history');
            setPayments([]);
            setCurrentPage(1);
            setTotalPages(1);
            setTotalPayments(0);
        } finally {
            setPaymentsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchPayments(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            fetchPayments(page);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!user) return null;

    return (
        <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                        {/* <div>
                            <button onClick={() => setShowPlanModal(true)} className="inline-block px-4 py-2 bg-indigo-600 text-white font-medium rounded shadow hover:bg-indigo-700">Upgrade Plan</button>
                        </div> */}
                    </div>
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
                            <dt className="text-sm font-medium text-gray-500">Member since</dt>
                            <dd className="text-sm text-gray-900">{new Date(user.created_at).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* PlanModal Popup */}
            <PlanModal
                apiKey={''}
                open={showPlanModal}
                onClose={() => setShowPlanModal(false)}
                userId={user?.id}
                plan={plan}
                contactCount={plan?.contactCount || 0}
            />

            {plan.planType !== 'free' && <div className="bg-white shadow-lg rounded-xl mb-8">
                <div className="px-8 py-6 border-b border-blue-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Plan Details</h3>
                </div>
                <div className="px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Type</p>
                            <p className="font-medium text-gray-900">{plan?.planType === 'paid' ? 'Paid' : 'Free'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Payment Status</p>
                            <p className="font-medium text-gray-900">{plan?.paymentStatus || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Activation Date</p>
                            <p className="font-medium text-gray-900">{plan?.activationDate ? new Date(plan.activationDate).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Billing End Date</p>
                            <p className="font-medium text-gray-900">{plan?.billingEndDate ? new Date(plan.billingEndDate).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>
                </div>
            </div>}

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <div className='min-w-[500px]'>
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Payments History</h3>
                    </div>
                    <div className="px-6 py-4">
                        {paymentsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="text-center py-12">
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                                <p className="mt-1 text-sm text-gray-500">You have not made any payments yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Contacts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {payments.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-3 py-2 text-sm text-gray-700">{new Date(p.createdAt || p.createdAt).toLocaleDateString()}</td>
                                                <td className="px-3 py-2 text-sm text-gray-700">${((p.originalPrice ?? p.amount) / 100).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-sm"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-800' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span></td>
                                                <td className="px-3 py-2 text-sm text-gray-700">{p.contactCount ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                                        <div className="flex items-center text-sm text-gray-500">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalPayments)} of {totalPayments} payments</div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                                            <div className="flex items-center space-x-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    return (
                                                        <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`px-3 py-1 text-sm font-medium rounded-md ${pageNum === currentPage ? 'bg-indigo-600 text-white' : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'}`}>{pageNum}</button>
                                                    )
                                                })}
                                            </div>
                                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
