"use client"

import styles from './styles'
import React from 'react';
import Input from '@/components/signup/Input';
import inputStyles from '@/components/signup/styles';

const Index = () => {
  const handleChange = () => {};
  return (
    <div className='md:px-[13%]'>
      <h1 className={styles.header}>Add your income</h1>
      <Input
      label='Income Source'
      name='amount'
      type='text'
      placeholder='Your expense amount'
      handleChange={handleChange}
      custom
      />
      <Input
      label='Amount'
      name='amount'
      type='text'
      placeholder='Your expense amount'
      handleChange={handleChange}
      custom
      />
      <Input 
      label='Date'
      name='date'
      type='date'
      placeholder='Expense date'
      handleChange={handleChange}
      custom
      />
      <button type='submit' className={styles.btn}>
        Add income
      </button>
    </div>
  )
}

export default Index