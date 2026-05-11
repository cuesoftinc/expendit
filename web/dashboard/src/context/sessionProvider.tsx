"use client"

import { getLocalStorageItem } from '@/utils/localStorage';
import React, { createContext, useEffect, useContext, ReactNode, useState, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { logoutApi } from '@/API/APIS/authApi';

export interface SessionProviderProps {
  children: ReactNode;
}

export interface SessionContextProps {
  sessionToken: string | null;
  setSessionToken: Dispatch<SetStateAction<string | null>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

export const SessionContext = createContext<SessionContextProps | undefined>(undefined);

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [ isLoading, setIsLoading ] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const storedValue: string | null = getLocalStorageItem("Expendit-token");
    const token: string | null = storedValue !== null ? JSON.parse(storedValue) : null;

    if(token && token !== null){
      const decodedToken = jwtDecode(token);
      
      if(decodedToken.exp !== undefined){

        if(decodedToken.exp * 1000 < new Date().getTime()) 
        (async () => await logoutApi({router, setIsLoading}))();
      }
    } 
  }, [router]);

  return (
    <SessionContext.Provider value={{sessionToken, setSessionToken, setIsLoading, isLoading}}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextProps => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useNavContext must be used within a AppProvider");
  }
  return context;
};
