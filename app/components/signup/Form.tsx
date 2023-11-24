"use client"
import React, { Fragment } from 'react';
import styles from './styles';
import Input  from './Input';
import LoaderSpinner from '../helpers/LoaderSpinner';
import Notification from '../helpers/Notification';
import { useSignUpCustomState } from './states';
  
const Form = () => {
  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit 
  } = useSignUpCustomState();

  return (
    <Fragment>
      {formError !== "" && <Notification msg={formError} type="error" />}
      {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
      <form className={`${styles.formCont}`} onSubmit={handleSubmit}>
        <p className={styles.subHead}>
          Create your account 
        </p>

        <Input 
          label='First Name'
          name='firstName'
          type='text'
          value={form.firstName}
          placeholder='Enter your Firstname'
          handleChange={handleChange}
        />
        <Input 
          label='Last Name'
          name='lastName'
          type='text'
          value={form.lastName}
          placeholder='Enter your Lastname'
          handleChange={handleChange}
        />
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
        <Input 
          label='Phone Number'
          name='phoneNumber'
          type='text'
          value={form.phoneNumber}
          placeholder='Enter your Phone Number'
          handleChange={handleChange}
        />

        <div className='w-full'>
          <div className={`${styles.check} mt-8`}>
            <input type="checkbox" className={styles.checkbox} />
            <p>
            By signing up, I agree to Expendit’s &nbsp;
            <span className={styles.links}>terms & conditions</span>
            </p>
          </div>
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
              :  "Sign up" 
            }
          </button>
        </div>
        <div className='mt-3 text-sm'>
          Already have an Account?
          &nbsp;
          <span className={styles.links}
            onClick={() => {}}>
            Log in
          </span>
        </div>
      </form>
    </Fragment>
  )
}

export default Form