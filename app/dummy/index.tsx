import { AiOutlineSetting, AiOutlineHistory } from 'react-icons/ai';
import { BsCurrencyDollar, BsShield } from 'react-icons/bs';
import { FiCreditCard, FiUser } from 'react-icons/fi';
import { MdOutlineCategory } from "react-icons/md";
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
