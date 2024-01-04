"use client"

import LoaderSpinner from "../helpers/LoaderSpinner";
import Input from "../signup/Input"
import { useForgotPasswordCustomState } from "./states"
import styles from './styles';

const PasswordReset = () => {
  const {
    form,
    formLoading,
    handleChange,
    handleSubmit 
  } = useForgotPasswordCustomState();
  return (
    <section className={styles.container}>
      <div>
        <h1 className={styles.heading}>Password reset</h1>
        <p>Enter the code sent to your email</p>
        <Input
          label="Email address"
          name="email"
          type="number"
          placeholder="Enter your email address"
          value={form.email}
          handleChange={handleChange}
        />
        <button 
          type='submit' 
          className={styles.btn} 
          disabled={formLoading}
          onClick={handleSubmit}
        >
          { formLoading 
            ? <LoaderSpinner 
              style='spin' 
              variant='spin-small' 
            /> 
            :  "Authorize" 
          }
        </button>
      </div>
    </section>
  )
}

export default PasswordReset