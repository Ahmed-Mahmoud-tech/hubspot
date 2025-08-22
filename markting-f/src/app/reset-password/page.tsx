'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import useRequest, { type ResetPasswordData } from '@/app/axios/useRequest';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

    const { resetPassword } = useRequest();

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        mode: 'onChange',
    });

    const password = watch('password');

    useEffect(() => {
        const tokenParam = searchParams?.get('token');
        if (tokenParam) {
            setToken(tokenParam);
            setIsValidToken(true);
        } else {
            setIsValidToken(false);
        }
    }, [searchParams]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            toast.error('Invalid reset token');
            return;
        }

        setIsLoading(true);
        try {
            const resetData: ResetPasswordData = {
                token,
                password: data.password,
            };

            const result = await resetPassword(resetData);
            toast.success(result.message);
            setIsSuccess(true);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            const errorMessage = axiosError?.response?.data?.message || 'Failed to reset password';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrength = (password: string) => {
        if (!password) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

        return {
            strength,
            label: labels[strength - 1] || '',
            color: colors[strength - 1] || '',
        };
    };

    // Invalid token page
    if (isValidToken === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Invalid Reset Link
                            </h1>
                            <p className="text-gray-600">
                                This password reset link is invalid or has expired.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href="/forgot-password"
                                className="block w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-center"
                            >
                                Request New Reset Link
                            </Link>

                            <Link
                                href="/login"
                                className="block w-full text-center text-gray-600 hover:text-gray-500 font-medium py-3"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success page
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Password Reset Complete
                            </h1>
                            <p className="text-gray-600">
                                Your password has been successfully reset. You can now sign in with your new password.
                            </p>
                        </div>

                        <button
                            onClick={() => router.push('/login')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            Sign In Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (isValidToken === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const passwordStrength = getPasswordStrength(password || '');

    // Reset password form
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Reset Your Password
                        </h1>
                        <p className="text-gray-600">
                            Enter your new password below
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Enter new password"
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {password && (
                                <div className="mt-2">
                                    <div className="flex mb-1">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-2 w-full mr-1 last:mr-0 rounded ${level <= passwordStrength.strength
                                                        ? passwordStrength.color
                                                        : 'bg-gray-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                        {passwordStrength.label}
                                    </p>
                                </div>
                            )}

                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Confirm new password"
                                    {...register('confirmPassword')}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Password Requirements */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li className={password?.length >= 8 ? 'text-green-600' : ''}>
                                    ✓ At least 8 characters long
                                </li>
                                <li className={/[a-z]/.test(password || '') ? 'text-green-600' : ''}>
                                    ✓ Contains lowercase letter
                                </li>
                                <li className={/[A-Z]/.test(password || '') ? 'text-green-600' : ''}>
                                    ✓ Contains uppercase letter
                                </li>
                                <li className={/\d/.test(password || '') ? 'text-green-600' : ''}>
                                    ✓ Contains number
                                </li>
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Resetting Password...
                                </div>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/login"
                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
