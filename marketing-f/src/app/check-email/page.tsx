'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { useState, Suspense } from 'react';
import useRequest from '../axios/useRequest';

function CheckEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const { resendVerificationEmail } = useRequest();

  const email = searchParams?.get('email') || '';

  const handleResendVerification = async () => {
    const emailToUse = email || manualEmail;

    if (!emailToUse) {
      toast.error('Email address is required to resend verification');
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerificationEmail({ email: emailToUse });
      toast.success(result.message);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || 'Failed to resend verification email';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve sent a verification link to your email address
            {email && (
              <span className="block font-medium text-gray-900 mt-1">
                {email}
              </span>
            )}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Verification Email Sent
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Please check your email and click the verification link to activate your account.
                    If you don&apos;t see the email, check your spam folder.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the email?
            </p>
            <button
              onClick={handleResendVerification}
              disabled={isResending || (!email && !manualEmail)}
              className={`text-sm font-medium ${isResending || (!email && !manualEmail)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-indigo-600 hover:text-indigo-500'
                }`}
            >
              {isResending ? 'Resending...' : 'Resend verification email'}
            </button>
            {!email && (
              <div className="space-y-3">
                <p className="text-xs text-red-500">
                  Email address not found. Please enter your email below:
                </p>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckEmailContent />
    </Suspense>
  );
}
