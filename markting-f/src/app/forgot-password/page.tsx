'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import useRequest, { type ForgotPasswordData } from '@/app/axios/useRequest';
import { Mail, ArrowLeft, Send } from 'lucide-react';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const { forgotPassword } = useRequest();

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        try {
            const result = await forgotPassword(data as ForgotPasswordData);
            toast.success(result.message);
            setEmailSent(true);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            const errorMessage = axiosError?.response?.data?.message || 'Failed to send reset email';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        {/* Success Icon */}
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Check Your Email
                            </h1>
                            <p className="text-gray-600">
                                We&apos;ve sent a password reset link to <strong>{getValues('email')}</strong>
                            </p>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 rounded-lg p-4 mb-6">
                            <h3 className="font-medium text-blue-900 mb-2">What&apos;s next?</h3>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Check your email inbox</li>
                                <li>• Click the reset link in the email</li>
                                <li>• Create your new password</li>
                                <li>• The link expires in 1 hour</li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4">
                            <button
                                onClick={() => setEmailSent(false)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Try Another Email
                            </button>

                            <Link
                                href="/login"
                                className="block w-full text-center text-indigo-600 hover:text-indigo-500 font-medium py-3"
                            >
                                Back to Login
                            </Link>
                        </div>

                        {/* Didn't receive email */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-sm text-gray-600 text-center">
                                Didn&apos;t receive the email? Check your spam folder or{' '}
                                <button
                                    onClick={() => setEmailSent(false)}
                                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                                >
                                    try again
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-6 h-6 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Forgot Password?
                        </h1>
                        <p className="text-gray-600">
                            No worries, we&apos;ll send you reset instructions
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Enter your email address"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Sending Reset Link...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <Send className="w-5 h-5 mr-2" />
                                    Send Reset Link
                                </div>
                            )}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Login
                        </Link>
                    </div>

                    {/* Additional Help */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-600 text-center">
                            Remember your password?{' '}
                            <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
