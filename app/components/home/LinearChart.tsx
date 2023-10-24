"use client"

import React from 'react';
import { 
AreaChart, 
ResponsiveContainer, 
Legend, 
XAxis, 
YAxis, 
CartesianGrid, 
Tooltip, 
Area } from 'recharts';
import styles from './styles';
import { AreaHomeChart } from '@/dummy';

const LinearChart = () => {
  return (
    <div className={styles.lineChartCont}>
      <p className={styles.header}>Expense Analytic</p>
      <ResponsiveContainer 
        width="100%" 
        height='80%' 
      >
        <AreaChart 
          data={AreaHomeChart} 
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        > 
          <defs>
            <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="x" minTickGap={10} tickLine={false} tickSize={2}  />
          <YAxis tickLine={false} minTickGap={10} tickSize={2} />
          <CartesianGrid stroke='3 3'  />
          <Legend />
          <Tooltip />
          <Area 
            type="monotone" 
            dataKey="expense" 
            stroke="#8884d8"  
            fillOpacity={1} 
            fill="url(#colorMonth)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default LinearChart
