"use client";

import { createContext, 
useContext, 
useEffect,
useState, 
Dispatch, 
ReactNode, 
SetStateAction 
} from "react";

interface MyItem {
  ID: string;
  name: string;
}

export interface HomeContextProps {
  homeState: number;
  setHomeState: Dispatch<SetStateAction<number>>;
  newString: string;
  setNewString: Dispatch<SetStateAction<string>>;
  formError: string;
  setFormError:  Dispatch<SetStateAction<string>>;
  formSuccess: string;
  setFormSuccess:  Dispatch<SetStateAction<string>>;
  formLoading: boolean;
  setFormLoading:  Dispatch<SetStateAction<boolean>>;
  items: MyItem[];
  setItems: Dispatch<SetStateAction<MyItem[]>>;
};

export interface HomeProviderProps {
  children: ReactNode;
};

const HomeContext = createContext<HomeContextProps | undefined>(undefined);

export const HomeProvider = ({ children }: HomeProviderProps) => {
  const [homeState, setHomeState] = useState<number>(2);
  const [newString, setNewString] = useState<string>("Testing for string");
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [items, setItems] = useState<{ ID: string; name: string; }[]>([]); 

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (formError !== "") {
        setFormLoading(false);
        setFormError("");
      }

      if (formSuccess !== "") {
        setFormLoading(false);
        setFormSuccess("");
      }
    }, 5000);

    return () => {
      clearTimeout(timerId);
    };
  }, [formError, formSuccess]);

  return (
    <HomeContext.Provider
      value={{ 
        homeState, 
        setHomeState, 
        newString, 
        setNewString,
        formError, 
        setFormError,
        formSuccess, 
        setFormSuccess,
        formLoading, 
        setFormLoading,
        items,
        setItems,
       }}
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
