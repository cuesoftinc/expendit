"use client"

import LoaderSpinner from "../helpers/LoaderSpinner";
import { useForgotPasswordCustomState } from "./states"
import styles from './styles';
import Image from 'next/image';
import Logo from '@/assets/images/logo.png';
import Link from 'next/link';
import { FaArrowLeft } from "react-icons/fa";
import EmailInput from "./email";

const Index = () => {
  return (
    <main className="h-[90vh]">
      <Link href="/dashboard" className=''>
        <Image 
          src={Logo} 
          alt='Expendit Logo' 
          width={85}
          className='mt-1'
        />
      </Link>
      <div className={styles.minWidth}>
        <EmailInput/>
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