"use client"

import LoaderSpinner from "../helpers/LoaderSpinner";
import Input from "../signup/Input"
import { useForgotPasswordCustomState } from "./states"
import styles from './styles';
import { PasswordResetProps } from "./types";

const PasswordReset: React.FC<PasswordResetProps> = ({ handleNext })=> {
  const {
    tokenForm,
    formLoading,
    handleChange,
  } = useForgotPasswordCustomState();
  return (
    <section className={styles.container}>
      <div>
        <h1 className={styles.heading}>Password reset</h1>
        <p>A code has been sent to your email address, enter the code below to reset your password</p>
        <Input
          label="Token"
          name="token"
          type="text"
          placeholder="Enter your token"
          value={tokenForm.token}
          handleChange={handleChange}
        />
        <button 
          type='submit' 
          className={styles.btn} 
          disabled={formLoading}
          onClick={handleNext}
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