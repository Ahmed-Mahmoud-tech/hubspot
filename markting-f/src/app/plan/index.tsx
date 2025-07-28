
import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { ErrorMessage } from './ErrorMessage';
import useRequest from '@/app/axios/useRequest';

interface PlanModalProps {
    apiKey: string;
    open: boolean;
    onClose: () => void;
    userId: number;
    plan: any; // userPlan object from parent
    contactCount: number;
}

export function PlanModal({ apiKey, open, onClose, userId, plan, contactCount }: PlanModalProps) {
    const { createStripeCheckoutSession } = useRequest();

    const initialContactCount = contactCount || 480000;
    // If plan is null, fallback to free plan for UI, but show correct message
    const [localPlan, setLocalPlan] = useState({ type: 'free', mergeGroupsUsed: 0, contactCount: initialContactCount });
    // Add input state for contact count (for paid plan)
    const [inputContactCount, setInputContactCount] = useState(initialContactCount + 500);
    const [error, setError] = useState('');
    const [billingType, setBillingType] = useState<'monthly' | 'yearly'>('monthly');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
        if (modalRef.current && e.target === modalRef.current) {
            onClose();
        }
    }


    // If plan is null, treat as free for UI, but show correct message
    React.useEffect(() => {
        if (plan) {
            setLocalPlan({
                type: plan.planType || 'free',
                mergeGroupsUsed: plan.mergeGroupsUsed || 0,
                contactCount: plan.contactCount || initialContactCount,
            });
            setInputContactCount((plan.contactCount || initialContactCount) + 500);
        } else {
            setLocalPlan({ type: 'free', mergeGroupsUsed: 0, contactCount: contactCount || initialContactCount });
            setInputContactCount((contactCount || initialContactCount) + 500);
        }
    }, [plan, contactCount]);

    if (!open) return null;

    // Pricing logic (use inputContactCount for paid plan)
    const monthlyCost = inputContactCount / 2000;
    const yearlyMonthlyCost = inputContactCount / 4000;
    const annualCost = yearlyMonthlyCost * 12;

    // Add userId as a prop to PlanModal
    // Usage: <PlanModal open={open} onClose={onClose} userId={userId} />
    // Update the function signature:
    // export function PlanModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: number }) {

    const handleUpgrade = async () => {
        try {
            // Enforce inputContactCount >= localPlan.contactCount
            if (inputContactCount < localPlan.contactCount) {
                setError(`Contact count cannot be less than your current count (${localPlan.contactCount.toLocaleString()})`);
                return;
            }
            const data = await createStripeCheckoutSession({
                planType: billingType,
                contactCount: inputContactCount,
                billingType,
                userId,
                apiKey
            }) as { sessionId: string };
            if (!data.sessionId) throw new Error('Stripe session error');
            // Use your Stripe public key here
            const stripePublicKey = 'pk_test_51RpU70HLTJKxRr2VrhSFOtEWl3HnkFMoVkEeW9jl3OMGqrtBDmNCUun76Kll9nwVvVMmNDTdWyDZ7N75lS0YCetv00dZwqN7WM'; // TODO: Replace with your real public key
            const stripe = await loadStripe(stripePublicKey);
            if (!stripe) throw new Error('Stripe.js failed to load');
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
        } catch (error) {
            let message = 'Unknown error';
            if (error instanceof Error) message = error.message;
            setError('Error upgrading plan: ' + message);
        }
    };

    // Message logic
    let infoMessage = '';
    let showUpgrade = false;
    if (!plan) {
        if (contactCount > 500000) {
            infoMessage = 'You have more than 500,000 contacts. You must upgrade your plan to continue merging.';
            showUpgrade = true;
        } else {
            infoMessage = 'You are currently on the free plan.';
        }
    } else if (plan.planType === 'free') {
        if (contactCount > 500000) {
            infoMessage = 'You have exceeded the free plan contact limit (500,000). Please upgrade your plan to continue merging.';
            showUpgrade = true;
        } else {
            infoMessage = 'You are already on the free plan.';
        }
    } else if (plan.planType === 'paid') {
        // If user is paid but contactCount > plan.contactLimit (if available)
        if (plan.contactLimit && contactCount > plan.contactLimit) {
            infoMessage = `You have exceeded your paid plan contact limit (${plan.contactLimit.toLocaleString()}). Please upgrade your plan to increase your contact limit.`;
            showUpgrade = true;
        } else {
            infoMessage = 'You are on a paid plan.';
        }
    }
    return (
        <div>
            <div
                ref={modalRef}
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000040] bg-opacity-30 backdrop-blur-sm transition-all"
                onClick={handleBackdropClick}
            >
                <div className="max-w-4xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200 relative animate-fade-in">
                    <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={onClose}>&times;</button>
                    <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2 text-center">Contact Merge Plans</h1>
                    <p className="text-gray-500 mb-8 text-center">Choose the best plan for your needs. Upgrade anytime for more features.</p>
                    <div className="mb-4 text-center">
                        <span className={`text-md font-semibold ${showUpgrade ? 'text-red-600' : 'text-green-600'}`}>{infoMessage}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Free Plan Card */}
                        <div className="bg-blue-50 border h-max border-blue-200 rounded-lg p-6 flex flex-col items-center shadow hover:shadow-lg transition relative">
                            <div className="absolute top-4 right-4">
                                <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-semibold shadow">Current</span>
                            </div>
                            {/* Shield icon for Free Plan */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v5c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V7l8-4z" />
                            </svg>
                            <div className="flex items-center gap-2 group mb-2">
                                <span className="text-3xl font-extrabold text-blue-700 tracking-tight">{localPlan.contactCount.toLocaleString()}</span>
                                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full shadow-sm cursor-help group-hover:bg-blue-200" title="Total contacts included in your plan">contacts</span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">Free Plan</h2>
                            <ul className="text-gray-600 mb-4 text-center text-md">
                                <li>✔️ Up to 500,000 contacts</li>
                                <li>✔️ Up to 20 merge groups</li>
                                <li>✔️ Basic duplicate detection</li>
                                <li>❌ No advanced features</li>
                            </ul>
                            <span className="text-blue-600 font-medium mb-2">You are on the free plan</span>
                        </div>
                        {/* Paid Plan Card */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex flex-col items-center shadow hover:shadow-lg transition relative">
                            <div className="absolute top-4 right-4">
                                <span className="bg-yellow-500 text-white text-xs px-3 py-1 rounded font-semibold shadow animate-bounce">Upgrade</span>
                            </div>
                            <div className="mb-2 text-yellow-500 flex flex-col items-center w-full">
                                {/* Paid Plan Icon: Crown/Star */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke="currentColor" strokeWidth="2" fill="#fef3c7" />
                                </svg>
                                <div className="flex items-center gap-2 group mb-2">
                                    <span className="text-3xl font-extrabold text-yellow-700 tracking-tight">{inputContactCount.toLocaleString()}</span>
                                    <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full shadow-sm cursor-help group-hover:bg-yellow-200" title="Total contacts included in your plan">contacts</span>
                                </div>
                            </div>
                            <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">Paid Plan</h2>
                            <ul className="text-gray-600 mb-4 text-center text-md">
                                <li>✔️ Unlimited merge groups</li>
                                <li>✔️ Dynamic pricing based on contact count</li>
                                <li>✔️ Monthly/Yearly billing options</li>
                            </ul>
                            <div className="mb-4 w-full flex flex-col items-center">
                                <label className="mb-2 text-sm text-gray-700 font-medium" htmlFor="contactCountInput">Contact Count</label>
                                <div className="relative w-32 mb-2">
                                    <input
                                        id="contactCountInput"
                                        type="number"
                                        min={localPlan.contactCount}
                                        value={inputContactCount === 0 ? '' : inputContactCount}
                                        onChange={e => {
                                            // Allow empty string for editing
                                            const val = e.target.value;
                                            if (val === '') {
                                                setInputContactCount(0);
                                            } else {
                                                setInputContactCount(Number(val));
                                            }
                                        }}
                                        onBlur={() => {
                                            // On blur, enforce minimum
                                            if (inputContactCount < localPlan.contactCount) {
                                                setInputContactCount(localPlan.contactCount);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center font-semibold text-yellow-700"
                                    />
                                </div>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <button
                                        className={`flex items-center gap-1 px-4 py-2 rounded-full font-semibold text-md shadow transition-all duration-200 border-2 focus:outline-none ${billingType === 'monthly' ? 'bg-yellow-500 text-white border-yellow-500 scale-105' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                        onClick={() => setBillingType('monthly')}
                                        aria-pressed={billingType === 'monthly'}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 17l4 4 4-4" /><path d="M12 21V3" /></svg>
                                        Monthly
                                    </button>
                                    <span className="mx-1 text-gray-400">|</span>
                                    <button
                                        className={`flex items-center gap-1 px-4 py-2 rounded-full font-semibold text-md shadow transition-all duration-200 border-2 focus:outline-none ${billingType === 'yearly' ? 'bg-yellow-500 text-white border-yellow-500 scale-105' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                        onClick={() => setBillingType('yearly')}
                                        aria-pressed={billingType === 'yearly'}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                        Yearly
                                    </button>
                                </div>
                                {billingType === 'monthly' ? (
                                    <div className="text-base text-yellow-700 font-semibold">${monthlyCost.toFixed(2)}/mo</div>
                                ) : (
                                    <div className="text-base text-yellow-700 font-semibold">${yearlyMonthlyCost.toFixed(2)}/mo <span className="text-xs text-gray-500">(${annualCost.toFixed(2)} total/year)</span></div>
                                )}
                            </div>
                            <span className="text-yellow-600 font-medium mb-2">Upgrade for more features</span>
                            <button
                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded mt-2 shadow"
                                onClick={handleUpgrade}
                            >Upgrade Plan</button>
                        </div>
                    </div>
                    <ErrorMessage error={error} />
                </div>
                <style>{`
            .animate-fade-in {
              animation: fadeIn 0.4s ease;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
            </div>
        </div>
    );
}
