"use client"
import React, { useEffect, useState } from 'react';
import { TbCurrencyNaira } from 'react-icons/tb';
import { useCustomState } from '@/hooks/responsive';
import Link from 'next/link';
import styles from './styles';
import { useHomeContext } from '../../context';

export interface expense {
  id?: number;
  category: string;
  amount: number;
  note: string;
  date?: string;
  history?: boolean;
};

export const Expense = ({ category, amount, note, date, history }: expense) => {
  const [ mobile ] = useCustomState();

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
  const { expenseData } = useHomeContext();

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
        {expenseData?.reverse().slice(0, 5).map((data:any, index: any) => (
          <Expense key={index} {...data} />
        ))}
      </div>
    </div>
  )
}

export default LatestExpenses