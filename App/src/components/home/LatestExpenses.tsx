"use client"
import React from 'react';
import { usePathname } from 'next/navigation'
import dayjs from "dayjs";
import { MdAdd } from "react-icons/md";
import { TbCurrencyNaira } from 'react-icons/tb';
import { useCustomState } from '@/hooks/responsive';
import Link from 'next/link';
import styles from './styles';
import { useHomeContext } from '../../context';
import  layoutStyles  from '../layouts/styles'

export interface expense {
  id?: number;
  category: string;
  amount: number;
  note: string;
  createdat?: string;
  history?: boolean;
};

export const Expense = ({ category, amount, note, createdat, history }: expense) => {
  const pathname = usePathname();
  const [ mobile ] = useCustomState();
  const isHistory = pathname === "/history";
  const formattedCreatedAt = dayjs(createdat).format('MMM D, YYYY h:mm A');

  return (
    <div className={styles.transactionContainer}>
      <span className="flex-1">{category}</span>
      <p className={styles.text}>
        <TbCurrencyNaira fontSize={mobile ? 15 : 20} /> 
        {amount.toString()}
      </p>
      <p className="flex-1">
        {!history 
        ? ( mobile 
          ? `${note?.slice(0, 20)}...` 
          : `${note?.slice(0, 35)}...`
        )
        : note
        }
      </p>
      {createdat && isHistory
        && <p className="flex-1 md:text-center text-left">{formattedCreatedAt}</p>
      }
    </div>
  )
};

const LatestExpenses = () => {
  const { expenseData } = useHomeContext();

  if(expenseData && expenseData.length > 0){
    return (
      <div className={styles.barContainer}>
        <div className={styles.transactionHeader}>
          <h1 className='text-lg'>Latest Expenses</h1>
          <Link href='/history' className={styles.link}>View all</Link>
        </div>
        <div className={styles.transactionsContainer}>
          <div className={styles.transactionsHeader}>
            <p className="flex-1">Category</p>
            <p className="flex-1">Amount</p>
            <p className="flex-1">Note</p>
          </div>
          {expenseData 
            && expenseData.slice().reverse().slice(0, 4).map((data:any, index: any) => (
            <Expense key={index} {...data} />
          ))}
        </div>
      </div>
    )
  } else {
    return (
      <div className={styles.barContainer}>
        <div className={styles.transactionHeader}>
          <h1 className='text-lg'>Latest Expenses</h1>
          <Link href='/history' className={styles.link}>View all</Link>
        </div>
        <div className="flex w-full min-h-[100px] justify-center items-center">
          <Link href="/expense">
            <button className={layoutStyles.navBtn}>
              <span >Add Expenses</span>
              <MdAdd fontSize={20}/>
            </button>
          </Link>
        </div>
      </div>
    )
  }
  
}

export default LatestExpenses