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
import { getCategoryApi } from '../API/APIS/categoryApi';
import { getExpenseApi, getMonthlyExpenseApi } from '../API/APIS/expenseApi';
import { getLocalStorageItem } from '@/utils/localStorage';

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
  presentIncome: number;
  setPresentIncome: Dispatch<SetStateAction<number>>;
  totalExpense: number;
  setTotalExpense: Dispatch<SetStateAction<number>>;
  totalBalance: number;
  setTotalBalance: Dispatch<SetStateAction<number>>;
  user: any;
  setUser: Dispatch<SetStateAction<any>>;
  expenseData: any;
  setExpenseData:  Dispatch<SetStateAction<any>>;
  categories: any;
  setCategories: Dispatch<SetStateAction<any>>;
};

export interface HomeProviderProps {
  children: ReactNode;
};

const HomeContext = createContext<HomeContextProps | undefined>(undefined);

export const HomeProvider = ({ children }: HomeProviderProps) => {
  const storedValue: string | null = getLocalStorageItem("Expendit-user");
  const presentUser: string | null = storedValue !== null ? JSON.parse(storedValue) : null;
  
  const [homeState, setHomeState] = useState<number>(2);
  const [newString, setNewString] = useState<string>("Testing for string");
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [presentIncome, setPresentIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [expenseData, setExpenseData] = useState<any>([]);
  const [ user, setUser ] = useState<any>(presentUser || null);
  const [ categories, setCategories] = useState<any>([]);
console.log(expenseData)
  // ---- Handle Form States ----
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

  // ---- Get Expense onLoad ----
  useEffect(() => {
    async function getExpenseData() {
      try {
        const data = await getExpenseApi();
        setExpenseData(data?.results);
        console.log(data.results)
      } catch (error) {
        console.error('Error fetching expense data:', error);
      }
    }
    getExpenseData();
  }, []);

  // ---- Get Monthly Expense onLoad ----
  useEffect(() => {
    async function getMonthlyExpense() {
      try {
        const res = await getMonthlyExpenseApi();
        if (res) {
          setTotalExpense(res?.totalExpense)
          console.log(res)
        }
      } catch (error) {
        console.error('Error fetching expense data:', error);
      }
    }

    getMonthlyExpense();
  }, []);
  

  // ---- Get Income OonLoad ----
  useEffect(() => {
    async function getIncome() {
      try {
        const res = await getIncomeApi();
        if (res) {
          setPresentIncome(res?.totalIncome)
          console.log(res)
        }
      } catch (error) {
        console.error('Error fetching expense data:', error);
      }
    }

    getIncome();
  }, []);

  // --- Get Categories onLoad ----
  useEffect(() => {
    const fetchAndSetCategories = async () => {
      const fetchedCat = await getCategoryApi();
      setCategories(fetchedCat);
    };

    fetchAndSetCategories();
  }, []);

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
        categories, 
        setCategories,
        totalExpense, 
        setTotalExpense,
        totalBalance, 
        setTotalBalance,
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
