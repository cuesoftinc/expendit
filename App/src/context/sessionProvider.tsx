"use client"

import React, { createContext, useEffect, ReactNode, useState, useContext } from 'react';

export interface SessionProviderProps {
  children: ReactNode;
}

export const SessionContext = createContext<string | null>(null);

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setSessionToken(storedToken);
  }, []);

  return (
    <SessionContext.Provider value={sessionToken}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  // if (!context) throw new Error("useSession must be used within a SessionProvider");
  return context;
} 
