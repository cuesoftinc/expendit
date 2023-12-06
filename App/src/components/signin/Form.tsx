"use client"
import React, { Fragment } from 'react';
import styles from './styles';
import Input  from '../signup/Input';
import LoaderSpinner from '../helpers/LoaderSpinner';
import Notification from '../helpers/Notification';
import { useSignInCustomState } from './states';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
  
const Form = () => {
  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit 
  } = useSignInCustomState();

  return (
    <Fragment>
      {formError !== "" && <Notification msg={formError} type="error" />}
      {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
      <form className={`${styles.formCont}`} onSubmit={handleSubmit}>
        <p className={styles.subHead}>
          Login
        </p>
        <Input 
          label='Email'
          name='email'
          type='email'
          value={form.email}
          placeholder='name@email.com'
          handleChange={handleChange}
        />
        <Input 
          label='Password'
          name='password'
          type='password'
          value={form.password}
          placeholder='Enter your Password'
          handleChange={handleChange}
        />
        <div className={styles.checkboxWrapper}>
            <p className={styles.checkbox}><input className='mr-2' type='checkbox'/>Remember me</p>
            <p className={styles.link}>Forgot password?</p>
        </div>

        <div className='w-full mt-6'>
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
              :  "Sign in" 
            }
          </button>
        </div>
        <div className={styles.buttonWrapper}>
            <button className={styles.button}>
              <span className={styles.googleButton}> <FcGoogle/> Login with Google</span>
            </button>
          </div>
          <p className={styles.signUp}>New to Expendit? <Link href="/signup" className={styles.link}>Create an account</Link></p>
      </form>
    </Fragment>
  )
}

export default Form