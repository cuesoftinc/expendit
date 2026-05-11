"use client"

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import FullPageLoader from './FullPageLoader';
import { getLocalStorageItem } from '@/utils/localStorage';
import { useSession } from '@/context';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isLoading } = useSession();

  const storedValue: string | null = getLocalStorageItem('ExpenditLoggedIn');
  const isUserLoggedIn: string = storedValue !== null ? JSON.parse(storedValue) : null;

  useEffect(() => {
    if (!isUserLoggedIn) {
      router.push('/signin');
    }
  }, [router, isUserLoggedIn]);

  if (
    !isUserLoggedIn || isLoading 
  ) return <FullPageLoader />;

  return <>{ children}</>;
};

export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isLoading } = useSession();

  const storedValue: string | null = getLocalStorageItem('ExpenditLoggedIn');
  const isUserLoggedIn: string = storedValue !== null ? JSON.parse(storedValue) : null;

  useEffect(() => {
    if (isUserLoggedIn) {
      router.push('/');
    }
  }, [router, isUserLoggedIn]);

  if (
    isUserLoggedIn || isLoading 
  ) return <FullPageLoader />;

  return <>{ children}</>;
}
