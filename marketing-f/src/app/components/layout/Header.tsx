'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { getCookie, deleteCookie } from 'cookies-next';
import { LogOut, User as UserIcon, BarChart3, Menu, X } from 'lucide-react';
import { toast } from 'react-toastify';
import useRequest, { type User } from '@/app/axios/useRequest';
import logo from '../../../../public/assets/images/logo.png';
import Link from 'next/link';

interface HeaderProps {
    user?: User | null;
    onUserUpdate?: (user: User | null) => void;
}

export default function Header({ user: propUser, onUserUpdate }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(propUser || null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { getProfile } = useRequest();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = getCookie('auth_token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const userData = await getProfile();
                setUser(userData);
                onUserUpdate?.(userData);
            } catch (error) {
                console.error('Failed to fetch user:', error);
                router.push('/login');
            }
        };

        if (!propUser && !user) {
            fetchUser();
        }
    }, [propUser, user, onUserUpdate, router, getProfile]);

    useEffect(() => {
        if (propUser) {
            setUser(propUser);
        }
    }, [propUser]);

    const handleLogout = () => {
        deleteCookie('auth_token');
        setUser(null);
        onUserUpdate?.(null);
        toast.success('Logged out successfully');
        router.push('/login');
    };



    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link href="/dashboard" className="flex items-center cursor-pointer" prefetch={false}>
                        <Image src={logo} alt="Logo" width={70} height={55} className="mr-3" />
                        <h1 className="font-semibold text-gray-900 text-sm md:text-xl">
                            Clear Root
                        </h1>
                    </Link>

                    <div className="flex items-center space-x-4">
                        <Link href="/profile" className="flex items-center space-x-2">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                            <span className="text-sm text-gray-700">
                                {user ? `${user.first_name} ${user.last_name}` : ''}
                            </span>
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="cursor-pointer inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <LogOut className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
