"use client"
import React, { useRef, useState } from 'react'
import { CiImport } from 'react-icons/ci';
import Input from '@/components/signup/Input';
import inputStyles from '@/components/signup/styles';
import styles from './styles';
import { useExpenseCustomState } from './states';

const Index = () => {
  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit
  } = useExpenseCustomState();

  const fileInput = useRef<any>(null);
  const [ selectedFiles, setSelectedFiles ] = useState(null);

  const handleFileUpload = (e: any) => {
    setSelectedFiles(e.target.files)
  };

  return (
    <div className='md:ml-3 ml-0'>
      <div className='md:w-[70%] w-full'>
        <h3 className={styles.header}>Add your new expense</h3>
        <div>
          <Input 
          label='Amount'
          name='amount'
          type='text'
          value={form.amount}
          placeholder='Your expense amount'
          handleChange={handleChange}
          custom
          />
          <Input 
          label='Date'
          name='date'
          type='date'
          value={form.date}
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
            <textarea rows={5} className={styles.textarea} maxLength={50} value={form.note} />
          </div>
          <div className={styles.divider}> 
            <hr className='w-full' />
            <span>OR</span>
            <hr className='w-full' />
          </div>
          <div className={styles.space}>
            <input type="file" hidden ref={fileInput} 
              onChange={(e) => handleFileUpload(e)}
            />
            <div 
              className={styles.iconWrapper}
              onClick={() => fileInput.current.click()}>
              <CiImport fontSize={18} className='mr-2' />
              <p className=''>Import</p>
            </div>
          </div>
          <button type='submit' className={inputStyles.btn}>
            Add expense
          </button>
        </div>
      </div>
    </div>
  )
}

export default Index