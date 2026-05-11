import React from 'react';
import Image from 'next/image';
import Form from './Form';
import signUpImage from '@/assets/images/signUp_purple.png';
import styles from './styles';

const Index = () => {
  return (
   <div className='flex min-h-screen '>
      <div className={styles.imgContainer}>
        <Image 
          src={signUpImage} 
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