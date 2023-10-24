"use client"
import React from 'react'
import Input from '@/components/signup/Input';
import inputStyles from '@/components/signup/styles';
import styles from './styles';

const Index = () => {
  const handleChange = () => {};

  return (
    <div className=''>
      <div className='md:px-[13%]'>
        <h3 className={styles.header}>Add your new expense</h3>
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
        <div className=''>
          <label className={inputStyles.label}>Category</label>
          <select className={styles.select}>
            <option value="food">Food</option>
            <option value="utility">utility</option>
            <option value="transportation">transportation</option>
          </select>
        </div>
        <div className='w-full'>
          <label className={inputStyles.label}>Note</label>
          <textarea rows={5} className={styles.textarea} />
        </div>
        <button type='submit' className={inputStyles.btn}>
          Add expense
        </button>
      </div>
    </div>
  )
}

export default Index