"use client"
import React from 'react';
import { 
LineChart, 
Line, 
CartesianGrid, 
Tooltip, 
XAxis, 
YAxis, 
Legend, 
ResponsiveContainer } from 'recharts';
import { LineExpenseChart } from '@/dummy';
import { useHomeContext } from '@/context';
import DownloadBtn from './DownloadBtn';
import styles from './styles';


const ExpenseTrends = () => {
  const { lineChart } = useHomeContext();

  return (
    <div className={`${styles.pieCont} mt-5`}>
      <p className={styles.header}>
        Expenses Monthly Trends
        <DownloadBtn />
      </p>
      <div className={styles.barChart}>
        <ResponsiveContainer width={'100%'} height='100%'>
          <LineChart  data={lineChart }
            margin={{top:0, right: 0, left:0, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="expense" stroke="#8884d8" />
          </LineChart>    
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ExpenseTrends