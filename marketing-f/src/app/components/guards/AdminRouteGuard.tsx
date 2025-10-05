'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const user = useSelector((state: any) => state.userInfo);

  useEffect(() => {
    // Check if user is loaded and is not admin
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // If no user info available, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Only render children if user is admin
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // Show unauthorized message while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-red-500 text-xl">Unauthorized. Redirecting...</div>
    </div>
  );
}