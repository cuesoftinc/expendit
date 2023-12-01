"use client"

import React, { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session) {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        router.push('/signin');
      }
    }
  }, [session, router]);

  return <>{children}</>;
};

export default ProtectedRoute;
