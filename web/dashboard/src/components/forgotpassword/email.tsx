"use client"

import React, { Fragment } from 'react';
import LoaderSpinner from "../helpers/LoaderSpinner";
import { useForgotPasswordCustomState } from "./states"
import Input from "../signup/Input"
import EmailModal from "../helpers/EmailModal";
import Notification from '../helpers/Notification';
import styles from './styles';

const EmailInput = () => {
  const {
    form,
    formLoading,
    formError,
    formSuccess,
    emailSuccess,
    setEmailSuccess,
    handleChange,
    handleEmailSubmit
  } = useForgotPasswordCustomState();

  return (
    <Fragment>
      {formError !== "" && <Notification msg={formError} type="error" />}
      {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
      <section className={styles.container}>
        <div>
          <h1 className={styles.heading}>Forgot your password?</h1>
          <p className="md:text-base text-sm">Enter the email associated with your 
          account <br /> and we&apos;ll send an email with 
          instructions to reset your password</p>
          <Input
            label="Email address"
            name="email"
            type="email"
            placeholder="Enter your email address"
            value={form.email}
            handleChange={handleChange}
          />
          <button 
            type='submit' 
            className={styles.btn} 
            disabled={formLoading}
            onClick={handleEmailSubmit}
          >
            { formLoading 
              ? <LoaderSpinner 
                style='spin' 
                variant='spin-small' 
              /> 
              :  "Send Instructions" 
            }
          </button>
        </div>
        {emailSuccess && <EmailModal setEmailSuccess={setEmailSuccess} />}
      </section>
    </Fragment>
  )
}

export default EmailInput