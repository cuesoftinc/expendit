import React from 'react';
import Image from 'next/image';
import Form from './Form';
import styles from './styles';
import LoginImg from '@/assets/images/expendit-login.png'

const Index = () => {
  return (
   <div className='flex min-h-screen '>
      <div className={styles.imgContainer}>
        <Image 
          src={LoginImg} 
          alt='Sign up image' 
          className='object-contain' 
        />
      </div>
      <div className='md:w-[55%] w-full'>
        <Form />
      </div>
   </div>
  )
}

export default Index