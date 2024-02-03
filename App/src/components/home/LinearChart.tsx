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
import { useHomeContext } from '@/context';

const LinearChart = () => {
  const { areaChart, categories } = useHomeContext();
  return (
    <div className={styles.lineChartCont}>
      <p className={styles.header}>Expense Categories</p>
      <ResponsiveContainer 
        width="100%" 
        height={380} 
      >
        <AreaChart 
          data={areaChart} 
          margin={{ top: 10, right: 10, left: 1, bottom: 10 }}
        > 
          <defs>
            <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="month" minTickGap={10} tickLine={false} tickSize={2}  />
          <YAxis tickLine={false} minTickGap={10} tickSize={2} />
          <CartesianGrid stroke='3 3'  />
          <Legend />
          <Tooltip />
          {categories?.map((propName: any, index: number) => (
            <Area 
            key={index}
            type="monotone" 
            dataKey={propName.name} 
            stroke={`#${Math.floor(Math.random() * 16777215).toString(16)}`} 
            strokeWidth={1}
            stackId="1"
            fillOpacity={1} 
            fill="url(#colorMonth)" 
          />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default LinearChart
