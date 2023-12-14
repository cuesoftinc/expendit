"use client"
import React, { useEffect } from 'react';
import { TbCurrencyNaira } from 'react-icons/tb';
import { useCustomState } from '@/hooks/responsive';
import Link from 'next/link';
import styles from './styles';
import { expenses } from '@/dummy';
import { getExpenseApi } from '@/API/APIS/expenseApi';

export interface expense {
  id?: number;
  category: string;
  amount: number;
  note: string;
  date?: string;
  history?: boolean;
};

export const Expense = ({ id, category, amount, note, date, history }: expense) => {
  const [ mobile ] = useCustomState();

  useEffect(() => {
    async function getExpenseData() {
      const expenseData = await getExpenseApi ()
      console.log(expenseData)
    }
    getExpenseData()
  })

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
      {date && <p className="flex-1 md:text-center text-left">{date}</p>}
    </div>
  )
};

const LatestExpenses = () => {
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
        {expenses.map((data, index) => (
          <Expense key={index} {...data} />
        ))}
      </div>
    </div>
  )
}

export default LatestExpenses