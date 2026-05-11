"use client";
import React, { 
useEffect,
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
  isProfileOpen: boolean;
  setIsProfileOpen: Dispatch<SetStateAction<boolean>>;
};

export interface NavProviderProps {
  children: ReactNode;
};

export const NavContext = createContext<NavContextProps | undefined>(undefined);

export const NavProvider = ({ children }: NavProviderProps) => {
 const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [navState, setNavState] = useState<string>("/");
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);
 

  useEffect(() => {
    const handleResize = () => setIsNavOpen(false);
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <NavContext.Provider
      value={{
        navState,
        setNavState,
        isNavOpen,
        setIsNavOpen,
        isProfileOpen, 
        setIsProfileOpen,
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
