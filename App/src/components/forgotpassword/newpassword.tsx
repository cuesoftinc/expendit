"use client"

import LoaderSpinner from "../helpers/LoaderSpinner";
import Input from "../signup/Input"
import { useForgotPasswordCustomState } from "./states"
import styles from './styles';
import { PasswordResetProps } from "./types";

const NewPassword: React.FC<PasswordResetProps> = ({ handleNext })=> {
  const {
    tokenForm,
    formLoading,
    handleChange,
  } = useForgotPasswordCustomState();
  return (
    <section className={styles.container}>
      <div>
        <h1 className={styles.heading}>Set new Password</h1>
        <p>Must have at least 8 characters</p>
        <Input
          label="New Password"
          name="new_password"
          type="password"
          placeholder="Enter your new password"
          value={tokenForm.token}
          handleChange={handleChange}
        />
        <Input
          label="Confirm Password"
          name="confirm_password"
          type="password"
          placeholder="Confirm password"
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
            :  "Reset Password" 
          }
        </button>
      </div>
    </section>
  )
}

export default NewPassword