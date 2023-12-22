import { expense } from '@/components/home/LatestExpenses';
import dayjs from "dayjs";
import { AiOutlineSetting, AiOutlineHistory } from 'react-icons/ai';
import { BsBoxSeam } from 'react-icons/bs';
import { FiCreditCard, FiUser, FiBarChart, } from 'react-icons/fi';
import { HiOutlineRefresh } from 'react-icons/hi';
import { MdOutlineCategory, MdShowChart } from "react-icons/md";
import { RxDashboard } from 'react-icons/rx';
import { TbMoneybag, TbTransferOut, TbReportAnalytics } from 'react-icons/tb';

import { GridColDef } from '@mui/x-data-grid';

const presentDate = dayjs().format('MMM D, YYYY h:mm A');

export const links = [
  {
    name: 'Overview',
    url: '/',
    icon: <RxDashboard />,
  },
  {
    name: 'Expense',
    url: '/expense',
    icon: <TbTransferOut />,
  },
  {
    name: 'Income',
    url: '/income',
    icon: <TbMoneybag />,
  },
    
  {
    name: 'History',
    url: '/history',
    icon: <AiOutlineHistory />,
  },
  {
    name: 'Categories',
    url: '/categories',
    icon: <MdOutlineCategory />,
  },  
  {
    name: 'Reports',
    url: '/reports',
    icon: <TbReportAnalytics />,
  },    
  {
    name: 'Settings',
    url: '/settings',
    icon: <AiOutlineSetting />,
  },    
];

export const userProfileData = [
  {
    icon: <FiUser />,
    title: 'My Profile',
    desc: 'Account Settings',
    iconColor: '#03C9D7',
    iconBg: '#E5FAFB',
    url: "/settings",
  },
  {
    icon: <TbMoneybag />,
    title: 'My Expense',
    desc: 'View or Add Expenses',
    iconColor: 'rgb(0, 194, 146)',
    iconBg: 'rgb(235, 250, 242)',
    url: "/expense",
  },
  {
    icon: <FiCreditCard />,
    title: 'My History',
    desc: 'View Expenses history',
    iconColor: 'rgb(255, 244, 229)',
    iconBg: 'rgb(254, 201, 15)',
    url: "/history",
  },
];

export const summaryData = [
  {
    icon: <HiOutlineRefresh />,
    amount: '172,958',
    percentage: '-12%',
    title: 'Total Income',
    iconColor: 'rgb(0, 194, 146)',
    iconBg: 'rgb(235, 250, 242)',
    chart: <MdShowChart  color='red'/>,
  },
  {
    icon: <FiBarChart />,
    amount: '250,396',
    percentage: '+38%',
    title: 'Total Expenses',
    iconColor: 'rgb(228, 106, 118)',
    iconBg: 'rgb(255, 244, 229)',
    chart: <MdShowChart  color='green'/>,
  },
  {
    icon: <BsBoxSeam />,
    amount: '150,396',
    percentage: '+23%',
    title: 'Balance',
    iconColor: 'rgb(255, 244, 229)',
    iconBg: 'rgb(254, 201, 15)',
    chart: <MdShowChart  color='green'/>,
  }
];

export const categories = [
  "Food",
  "Transport",
  "Groceries",
  "Utility",
  "Data",
  "School",
  "Netflix",
  "Gaming",
]

export const AreaHomeChart = [
  { 
    month: 'Jan',
    Food: 2500,
    Transport: 6000,
    Groceries: 5800,
    Utility: 7000,
    Data: 1500,
    School: 3500,
    Netflix: 8500,
    Gaming: 7000,
  },
  { 
    month: 'Feb',
    Food: 1500,
    Transport: 5000,
    Groceries: 4800,
    Utility: 6000,
    Data: 1000,
    School: 1500,
    Netflix: 7500,
    Gaming: 6000,
  },
  { 
    month: 'Mar',
    Food: 3500,
    Transport: 6000,
    Groceries: 5800,
    Utility: 8000,
    Data: 4500,
    School: 1500,
    Netflix: 4500,
    Gaming: 7000,
  },
  { 
    month: 'Apr',
    Food: 4500,
    Transport: 8000,
    Groceries: 2800,
    Utility: 5000,
    Data: 5500,
    School: 6500,
    Netflix: 5500,
    Gaming: 2000,
  },
  { 
    month: 'May',
    Food: 6509,
    Transport: 9000,
    Groceries: 1800,
    Utility: 5000,
    Data: 5500,
    School: 6504,
    Netflix: 5504,
    Gaming: 2005,
  },
  { 
    month: 'Jun',
    Food: 6350,
    Transport: 9050,
    Groceries: 1800,
    Utility: 5000,
    Data: 5900,
    School: 8504,
    Netflix: 3504,
    Gaming: 3005,
  },
];

export const AreaExpenseChart = [
  { category: 'Food', 'expense': 2500 },
  { category: 'Transport',   'expense': 6000},
  { category: 'Groceries', 'expense': 5800 },
  { category: 'Utility', 'expense': 7000 },
  { category: 'Data', 'expense': 1500 },
  { category: 'School', 'expense': 3500 },
  { category: 'Netflix', 'expense': 9500 },
  { category: 'Gaming', 'expense': 7000 },
];

export const BarExpenseChart = [
  { month: 'Jan', 'expense': 25000, income: 35000 },
  { month: 'Feb', 'expense': 60000, income: 25000 },
  { month: 'Mar', 'expense': 58000, income: 57000 },
  { month: 'Apr', 'expense': 70000, income: 24000 },
  { month: 'May', 'expense': 15000, income: 72000 },
  { month: 'Jun', 'expense': 35000, income: 13000 },
];

export const LineExpenseChart = [
  { month: 'Jan', 'expense': 5500 },
  { month: 'Feb', 'expense': 6000 },
  { month: 'Mar', 'expense': 5800 },
  { month: 'Apr', 'expense': 7000 },
  { month: 'May', 'expense': 4500 },
  { month: 'Jun', 'expense': 4500 },
];

export const expenseGrid: GridColDef[] = [
  {
    field: 'Category',
    headerName: 'Category',
    flex: 1,
    headerClassName: 'header'
  },
  {
    field: 'Amount',
    headerName: 'Amount',
    flex: 1,
    headerClassName: 'header'
  },
  { field: 'Note',
    headerName: 'Note',
    flex: 1,
    headerClassName: 'header'
  },
  {
    field: 'Date',
    headerName: 'Date',
    flex: 1,
    headerClassName: 'header'
  }
];

export const expenseRow: expense[] = [
  // {
  //   id: 1,
  //   category: 'Food',
  //   amount: 2000,
  //   note: 'I used it to buy Food',
  //   date: presentDate
  // },
  // {
  //   id: 2,
  //   category: 'Transport',
  //   amount: 1500,
  //   note: 'I entered bus to mainland',
  //   date: presentDate
  // },
  // {
  //   id: 3,
  //   category: 'Groceries',
  //   amount: 5000,
  //   note: 'I visited the mall to get some groceries',
  //   date: presentDate
  // },
  // {
  //   id: 4,
  //   category: 'Food',
  //   amount: 2000,
  //   note: 'I used it to buy Food',
  //   date: presentDate
  // },
  // {
  //   id: 5,
  //   category: 'Transport',
  //   amount: 1500,
  //   note: 'I entered bus to mainland',
  //   date: presentDate
  // },
  // {
  //   id: 6,
  //   category: 'Groceries',
  //   amount: 5000,
  //   note: 'I visited the mall to get some groceries ',
  //   date: presentDate
  // },
];

export const expenses: expense[] = [
  {
    id: 1,
    category: 'Food',
    amount: 2000,
    note: 'I used it to buy food'
  },
  {
    id: 2,
    category: 'Transport',
    amount: 1500,
    note: 'I entered bus to mainland'
  },
  {
    id: 3,
    category: 'Groceries',
    amount: 5000,
    note: 'I visited the mall to get some groceries'
  },
];
