"use client"
import React from 'react'
import { 
BarChart, 
ResponsiveContainer, 
Legend,  
XAxis, 
YAxis, 
CartesianGrid, 
Tooltip, 
Bar } from 'recharts';
import { BarExpenseChart } from '@/dummy';
import { useCustomState } from '@/hooks/responsive';
import DownloadBtn from './DownloadBtn';
import styles from './styles';
import { getReportApi } from '@/API/APIS/reportApi';


const ExpenseComparisonByCat = () => {
  const [ mobile ] = useCustomState();

  return (
    <div className={styles.barCont}>
      <div className={styles.header}>
        Monthly Income vs Expenses
        <DownloadBtn />
      </div>
      <div className={styles.barChart}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart
            data={BarExpenseChart}
            margin={{top:0, right: 0, left:0, bottom: 0}}
            >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="income" fill="#82ca9d" stackId={mobile ? "a" : "a"} type='string' />
            <Bar dataKey="expense" fill="#8884d8" stackId={mobile ? "a" : "b"} type='string' />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ExpenseComparisonByCat