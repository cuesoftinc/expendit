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
import { getBarChartApi } from '../API/APIS/reportApi';
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
  barChart: any;
  setBarChart: Dispatch<SetStateAction<any>>;
};

export interface HomeProviderProps {
  children: ReactNode;
};

const HomeContext = createContext<HomeContextProps | undefined>(undefined);

export const HomeProvider = ({ children }: HomeProviderProps) => {
  const storedValue: string | null = getLocalStorageItem("Expendit-user");
  const presentUser: string | null = storedValue !== null ? JSON.parse(storedValue) : null;
  
  const [ user, setUser ] = useState<any>(presentUser || null);
  const [homeState, setHomeState] = useState<number>(2);
  const [newString, setNewString] = useState<string>("Testing for string");
  // ---- Form states ----
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formLoading, setFormLoading] = useState<boolean>(false);
  // ---- Financial states ----
  const [presentIncome, setPresentIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [expenseData, setExpenseData] = useState<any>([]);
  // ---- other states ----
  const [categories, setCategories] = useState<any>([]);
  const [barChart, setBarChart] = useState<any>([]);

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

  // ---- Populate All User states onLoad ----
  useEffect(() => {
    async function getInitialData() {
      try {
        const [
          userExpenseRes, 
          totalMonthExpenseRes,
          totalMonthIncomeRes, 
          categoryRes, 
          barChartRes 
        ] = await Promise.all([
          getExpenseApi(),
          getMonthlyExpenseApi(),
          getIncomeApi(),
          getCategoryApi(),
          getBarChartApi()
        ]);

          if(userExpenseRes){
            setExpenseData(userExpenseRes.results);
            console.log(userExpenseRes)
          };

          if(totalMonthExpenseRes){
            setTotalExpense(totalMonthExpenseRes.totalExpense);
            console.log(totalMonthExpenseRes)
          };

          if(totalMonthIncomeRes){
            setPresentIncome(totalMonthIncomeRes.totalIncome);
            console.log(totalMonthIncomeRes)
          };

          if(categoryRes){
            setCategories(categoryRes);
          };

          if(barChartRes){
            console.log(barChartRes)
          }
      } catch (error) {
        console.error('Error fetching expense data:', error);
      }
    }

    getInitialData();
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
        barChart, 
        setBarChart,
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
