"use client";

import React, { 
useContext, 
createContext, 
useState, 
Dispatch, 
ReactNode, 
SetStateAction 
} from "react";

export interface NavContextProps {
  navState: string;
  setNavState: Dispatch<SetStateAction<string>>;
  isNavOpen: boolean;
  setIsNavOpen: Dispatch<SetStateAction<boolean>>;
};

export interface NavProviderProps {
  children: ReactNode;
};

export const NavContext = createContext<NavContextProps | undefined>(undefined);

export const NavProvider = ({ children }: NavProviderProps) => {
  const [navState, setNavState] = useState<string>("/");
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);

  return (
    <NavContext.Provider
      value={{
        navState,
        setNavState,
        isNavOpen,
        setIsNavOpen,
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export const useNavContext = (): NavContextProps => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error("useNavContext must be used within a AppProvider");
  }
  return context;
};
