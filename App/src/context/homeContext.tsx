"use client";

import { createContext, 
useContext, 
useEffect,
useState, 
Dispatch, 
ReactNode, 
SetStateAction 
} from "react";
import { getIncomeApi } from '../API/APIS/incomeApi';
import { getUserApi } from '../API/APIS/userApi';
import { getExpenseApi } from '../API/APIS/expenseApi';

interface MyItem {
  ID:string;
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
  presentIncome: string;
  setPresentIncome: Dispatch<SetStateAction<string>>;
  user: any;
  setUser: Dispatch<SetStateAction<any>>;
  expenseData: any;
  setExpenseData:  Dispatch<SetStateAction<any>>;
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
  const [presentIncome, setPresentIncome] = useState<string>("");
  const [expenseData, setExpenseData] = useState<any>([]);
  const [ user, setUser ] = useState(null);
  const [items, setItems] = useState<{ ID: string; name: string; }[]>([])

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
  }, [formError, formSuccess, formLoading]);

  useEffect(() => {
    async function getIncome(){
      try {
        const res = await getIncomeApi();
        if(res){
          // setPresentIncome(res[0].ID)
          console.log(res)
        }
      } catch (error) {
        console.error('Error fetching expense data:', error);
      }
    }

    getIncome();
  }, [user]);

  useEffect(() => {
    async function populateUser(){
      try {
        const userData = await getUserApi(setFormLoading);
        if(userData) {
          setUser(userData);
        }
      } catch (error){
        console.error('Error fetching expense data:', error);
      }
      
    };

    populateUser();
  }, []);

  useEffect(() => {
    async function getExpenseData() {
      try {
        const data = await getExpenseApi();
        setExpenseData(data);
      } catch (error) {
        console.error('Error fetching expense data:', error);
      }
    }
    getExpenseData();
  }, [user]);

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
        presentIncome, 
        setPresentIncome,
        user, 
        setUser,
        expenseData, 
        setExpenseData,
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
