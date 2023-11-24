import React from 'react';
import Image from 'next/image';
import Form from './Form';
import signUpImage from '@/assets/images/signUp_purple.png';

const Index = () => {
  return (
   <div className='flex min-h-screen '>
      <div className='w-[45%] bg-[#F3E8FF] md:block hidden'>
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