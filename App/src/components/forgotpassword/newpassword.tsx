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

const NewPassword = ()=> {
  const {
    passwordForm,
    formLoading,
    handlePasswordChange,
    handlePasswordSubmit
  } = useForgotPasswordCustomState();

 
  return (
    <main className="h-screen">
      <Link href="/dashboard" className=''>
        <Image 
          src={Logo} 
          alt='Expendit Logo' 
          width={85}
          className='mt-6 ml-4'
        />
      </Link>
      <div className={styles.minWidth}>
        <section className={styles.container}>
          <div className="sm:w-[500px] w-full flex flex-col items-center mx-4">
            <h1 className={styles.heading}>Set new Password</h1>
            <p>Must have at least 8 characters</p>
            <Input
              label="New Password"
              name="new_password"
              type="password"
              placeholder="Enter your new password"
              value={passwordForm.new_password}
              handleChange={handlePasswordChange}
            />
            <Input
              label="Confirm Password"
              name="con_mpassword"
              type="password"
              placeholder="Confirm password"
              value={passwordForm.con_password}
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