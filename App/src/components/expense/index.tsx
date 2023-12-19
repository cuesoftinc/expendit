"use client"
import React from 'react'
import { CiImport } from 'react-icons/ci';
import Input from '@/components/signup/Input';
import inputStyles from '@/components/signup/styles';
import { useExpenseCustomState } from './states';
import Notification from '../helpers/Notification';
import LoaderSpinner from '../helpers/LoaderSpinner';
import styles from './styles';


const Index = () => {
  const {
    form,
    category,
    fileInput,
    selectedFiles,
    formatValue,
    formLoading,
    setSelectedFiles,
    handleFileUpload,
    handleCategory,
    handleChange,
    handleSubmit
  } = useExpenseCustomState();

  return (
    <div className='md:ml-3 ml-0'>
      <div className='md:w-[50%] w-full'>
        <h3 className={styles.header}>Add your new expense</h3>
        <div>
        <Input 
          label='Amount'
          name='amount'
          type='text'
          value={formatValue(form.amount)}
          placeholder='Your expense amount'
          handleChange={handleChange}
          custom
        />
        <div className=''>
          <label className={inputStyles.label}>Category</label>
          <select className={styles.select} onChange={handleCategory} value={category}>
            <option value="food">Food</option>
            <option value="utility">utility</option>
            <option value="transportation">transportation</option>
          </select>
        </div>
        <div className='w-full'>
          <label className={inputStyles.label}>Note</label>
          <textarea 
            rows={5}
            name='note' 
            value={form.note}
            className={styles.textarea} 
            maxLength={50} 
            onChange={handleChange} 
          />
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
        <button type='submit' 
          disabled={formLoading} 
          className={inputStyles.btn} 
          onClick={handleSubmit}
        >
          Add expense
        </button>
        </div>
      </div>
    </div>
  )
}

export default Index