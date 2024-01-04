"use client"

import LoaderSpinner from "../helpers/LoaderSpinner";
import Input from "../signup/Input"
import { useForgotPasswordCustomState } from "./states"
import styles from './styles';
import Image from 'next/image';
import Logo from '@/assets/images/logo.png';
import Link from 'next/link';
import EmailInput from "./email";
import PasswordReset from "./passwordreset";
import { useState } from "react";
import NewPassword from "./newpassword";
import { FaArrowLeft } from "react-icons/fa";

const Index = () => {

  const {
    handleNext,
    currentStep,
    setCurrentStep
  } = useForgotPasswordCustomState();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <EmailInput handleNext={() => handleNext(setCurrentStep)} />
      case 2:
        return <PasswordReset handleNext={() => handleNext(setCurrentStep)} />
      case 3:
        return <NewPassword handleNext={() => handleNext(setCurrentStep)} />
    
      default:
        return null;
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
        {renderStep()}
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

export default Index