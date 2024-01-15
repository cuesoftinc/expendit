"use client"

import LoaderSpinner from "../helpers/LoaderSpinner";
import Input from "../signup/Input"
import { useForgotPasswordCustomState } from "./states"
import styles from './styles';
import { PasswordResetProps } from "./types";
import Image from 'next/image';
import Logo from '@/assets/images/logo.png';
import Link from 'next/link';
import { FaArrowLeft } from "react-icons/fa";
import { postNewPasswordApi } from '@/API/APIS/forgotPasswordApi';

const NewPassword = ()=> {
  const {
    passwordForm,
    formLoading,
    handlePasswordChange,
  } = useForgotPasswordCustomState();

  const handlePasswordSubmit = async () => {
    try {
      // const resetToken = router.query.token as string;
      // const payload = JSON.stringify({passwordForm});

      // await postNewPasswordApi(resetToken, payload);
      
      // router.push('/forgotpassword/success');
    } catch (error) {
      console.log(error)
    }
  };
  return (
    <main className="h-screen">
      <Link href="/dashboard" className=''>
        <Image 
          src={Logo} 
          alt='Expendit Logo' 
          width={85}
          className='mt-6'
        />
      </Link>
      <div className={styles.minWidth}>
        <section className={styles.container}>
          <div>
            <h1 className={styles.heading}>Set new Password</h1>
            <p>Must have at least 8 characters</p>
            <Input
              label="New Password"
              name="new_password"
              type="password"
              placeholder="Enter your new password"
              value={passwordForm.newpassword}
              handleChange={handlePasswordChange}
            />
            <Input
              label="Confirm Password"
              name="confirm_password"
              type="password"
              placeholder="Confirm password"
              value={passwordForm.confirmpassword}
              handleChange={handlePasswordChange}
            />
            <button 
              type='submit' 
              className={styles.btn} 
              disabled={formLoading}
              onClick={handlePasswordSubmit}
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
      </div>
      <Link href='/signin' className={styles.alignCenter}>
        <div className="flex items-center gap-2 text-gray-500">
          <FaArrowLeft />
          <p>Back to Login</p>
        </div>
      </Link>
    </main>
    
  )
}

export default NewPassword