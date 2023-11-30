"use client"

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/sessionProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session) {

      router.push('/signin');
    }
  }, [session, router]);

  return <>{children}</>;
};

export default ProtectedRoute;
