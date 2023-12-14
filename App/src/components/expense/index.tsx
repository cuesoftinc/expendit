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
    formError,
    formSuccess,
    formLoading,
    fileInput,
    selectedFiles,
    setSelectedFiles,
    handleFileUpload,
    handleChange,
    handleSubmit
  } = useExpenseCustomState();

  return (
    <div className='md:ml-3 ml-0'>
      <div className='md:w-[70%] w-full'>
        <h3 className={styles.header}>Add your new expense</h3>
        {formError !== "" && <Notification msg={formError} type="error" />}
        {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
        <form>
          <Input 
            label='Amount'
            name='amount'
            type='text'
            value={form.amount}
            placeholder='Your expense amount'
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
            <textarea rows={5} className={styles.textarea} maxLength={50} />
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
            {/* <div className=''>
              <label className={inputStyles.label}>Category</label>
              <select className={styles.select}>
                <option value="food">Food</option>
                <option value="utility">utility</option>
                <option value="transportation">transportation</option>
              </select>
            </div> */}
          </div>
          <button
            type='submit'
            className={inputStyles.btn}
            onClick={handleSubmit}
            disabled={formLoading}
          >  
          { formLoading 
              ? <LoaderSpinner 
                style='spin' 
                variant='spin-small' 
              /> 
              :  "Add expense"
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default Index