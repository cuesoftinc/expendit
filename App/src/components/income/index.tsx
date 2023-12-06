"use client"

import styles from './styles'
import React from 'react';
import Input from '@/components/signup/Input';
import { useIncomeCustomState } from './states';
import LoaderSpinner from '../helpers/LoaderSpinner';
import Notification from '../helpers/Notification';

const Index = () => {
  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit 
  } = useIncomeCustomState();
  return (
    <div className='md:ml-3 ml-0'>
      <h1 className={styles.header}>Add your income</h1>
      {formError !== "" && <Notification msg={formError} type="error" />}
      {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
      <form className='md:w-[70%] w-full' onSubmit={handleSubmit}>
        <Input
        label='Income Source'
        name='amount'
        type='text'
        placeholder='Your income source'
        value = {form.amount}
        handleChange={handleChange}
        custom
        />
        <Input
        label='Amount'
        name='amount'
        type='text'
        placeholder='Your expense amount'
        value = {form.amount}
        handleChange={handleChange}
        custom
        />
        <Input 
        label='Date'
        name='date'
        type='date'
        placeholder='Expense date'
        value = {form.date}
        handleChange={handleChange}
        custom
        />
        <button 
            type='submit' 
            className={styles.btn} 
            disabled={formLoading}
          >
            { formLoading 
              ? <LoaderSpinner 
                style='spin' 
                variant='spin-small' 
              /> 
              :  "Add income"
            }
          </button>
      </form>
    </div>
  )
}

export default Index