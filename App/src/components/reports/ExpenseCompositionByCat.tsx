"use client"
import React from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import { useCustomState } from '@/hooks/responsive';
import { AreaExpenseChart } from '@/dummy';
import DownloadBtn from './DownloadBtn';
import styles from './styles';

const ExpenseCompositionByCat = () => {
  const [ mobile ] = useCustomState();

  return (
    <div className={styles.pieCont}>
      <p className={styles.header}>
        Current Expenses Breakdown
        <DownloadBtn />
      </p>
      <ResponsiveContainer width="100%" height={mobile ? 450 : 500}>
        <PieChart width={600} >
          <defs>
            <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <Pie 
            data={AreaExpenseChart} 
            nameKey="category" 
            dataKey="expense" 
            fill="url(#colorMonth)"  
            cx="50%" 
            cy="50%" 
            outerRadius={mobile ? 100 : 200} 
            label 
          />
          <Tooltip />                
        </PieChart>  
      </ResponsiveContainer>   

    </div>
  )
}

export default ExpenseCompositionByCat
