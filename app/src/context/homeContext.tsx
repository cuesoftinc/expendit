"use client";

import { createContext, 
useContext, 
useState, 
Dispatch, 
ReactNode, 
SetStateAction 
} from "react";

export interface HomeContextProps {
  homeState: number;
  setHomeState: Dispatch<SetStateAction<number>>;
  newString: string;
  setNewString: Dispatch<SetStateAction<string>>;
};

export interface HomeProviderProps {
  children: ReactNode;
};

const HomeContext = createContext<HomeContextProps | undefined>(undefined);

export const HomeProvider = ({ children }: HomeProviderProps) => {
  const [homeState, setHomeState] = useState<number>(2);

  const [newString, setNewString] = useState<string>("Testing for string");

  return (
    <HomeContext.Provider
      value={{ homeState, setHomeState, newString, setNewString }}
    >
      {children}
    </HomeContext.Provider>
  );
};

export const useHomeContext = () => {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error("useHomeContext must be used within a AppProvider");
  }
  return context;
};
