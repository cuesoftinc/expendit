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

const Index = () => {
  const {
    form,
    formLoading,
    handleChange,
    handleSubmit,
    handleNext,
  } = useForgotPasswordCustomState();
  return (
    <main className="h-screen">
      <Link href="/dashboard" className=''>
        <Image 
          src={Logo} 
          alt='Expendit Logo' 
          width={85}
          className='ml-5 mt-6'
        />
      </Link>
      <div>
          <EmailInput />
          <PasswordReset />
      </div>
    </main>
  )
}

export default Index