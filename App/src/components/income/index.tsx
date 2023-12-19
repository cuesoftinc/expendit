"use client"

import styles from './styles'
import React from 'react';
import Input from '@/components/signup/Input';
import { useIncomeCustomState } from './states';
import LoaderSpinner from '../helpers/LoaderSpinner';

const Index = () => {
  const {
    form,
    formLoading,
    formatValue,
    handleChange,
    handleSubmit 
  } = useIncomeCustomState();
  return (
    <div className='md:ml-3 ml-0'>
      <h1 className={styles.header}>Add your income</h1>
      <form className='md:w-[50%] w-full' onSubmit={handleSubmit}>
        <Input
          label='Income Source'
          name='source'
          type='text'
          placeholder='Your income source'
          value = {form.source}
          handleChange={handleChange}
          custom
        />
        <Input
          label='Amount'
          name='amount'
          type='text'
          placeholder='Your expense amount'
          value = {formatValue(form.amount)}
          handleChange={handleChange}
          custom
        />
        <Input 
          label='Description'
          name='description'
          type='text'
          placeholder='write a short description'
          value = {form.description}
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