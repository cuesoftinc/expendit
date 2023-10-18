import { MdOutlineCategory } from "react-icons/md";
import { TbMoneybag, TbTransferOut, TbReportAnalytics } from 'react-icons/tb';
import { RxDashboard } from 'react-icons/rx';
import { AiOutlineSetting, AiOutlineHistory } from 'react-icons/ai';

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
