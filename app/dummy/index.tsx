import { AiOutlineSetting, AiOutlineHistory } from 'react-icons/ai';
import { BsCurrencyDollar, BsShield, BsBoxSeam } from 'react-icons/bs';
import { FiCreditCard, FiUser, FiBarChart, } from 'react-icons/fi';
import { HiOutlineRefresh } from 'react-icons/hi';
import { MdOutlineCategory, MdOutlineSupervisorAccount, MdShowChart } from "react-icons/md";
import { RxDashboard } from 'react-icons/rx';
import { TbMoneybag, TbTransferOut, TbReportAnalytics } from 'react-icons/tb';


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
  },
  {
    icon: <TbMoneybag />,
    title: 'My Expense',
    desc: 'View or Add Expenses',
    iconColor: 'rgb(0, 194, 146)',
    iconBg: 'rgb(235, 250, 242)',
  },
  {
    icon: <FiCreditCard />,
    title: 'My History',
    desc: 'View Expenses history',
    iconColor: 'rgb(255, 244, 229)',
    iconBg: 'rgb(254, 201, 15)',
  },
];

export const summaryData = [
  {
    icon: <HiOutlineRefresh />,
    amount: '$172,958',
    percentage: '-12%',
    title: 'Total Income',
    iconColor: 'rgb(0, 194, 146)',
    iconBg: 'rgb(235, 250, 242)',
    chart: <MdShowChart  color='red'/>,
  },
  {
    icon: <FiBarChart />,
    amount: '$250,396',
    percentage: '+38%',
    title: 'Total Expenses',
    iconColor: 'rgb(228, 106, 118)',
    iconBg: 'rgb(255, 244, 229)',
    chart: <MdShowChart  color='green'/>,
  },
  {
    icon: <BsBoxSeam />,
    amount: '$150,396',
    percentage: '+23%',
    title: 'Balance',
    iconColor: 'rgb(255, 244, 229)',
    iconBg: 'rgb(254, 201, 15)',
    chart: <MdShowChart  color='green'/>,
  }
];

export const AreaHomeChart = [
  { x: 'Jan', 'expense': 250 },
  { x: 'Feb',   'expense': 600},
  { x: 'Mar', 'expense': 580 },
  { x: 'Apr', 'expense': 700 },
  { x: 'May', 'expense': 150 },
  { x: 'June', 'expense': 350 },
  { x: 'July', 'expense': 290 },
  { x: 'Aug', 'expense': 800 },
  { x: 'Sep', 'expense': 950 },
  { x: 'Oct', 'expense': 700 },
  { x: 'Nov', 'expense': 160 },
  { x: 'Dec', 'expense': 980 },
];

