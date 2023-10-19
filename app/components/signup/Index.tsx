import React from 'react';
import Image from 'next/image';
import Form from './Form';
import signUpImage from '@/assets/images/signUp_purple.png';

const Index = () => {
  return (
   <div className='flex min-h-screen'>
      <div className='w-[45%] bg-[#F3E8FF]'>
        <Image 
          src={signUpImage} 
          alt='Sign up image' 
          className='object-contain' 
        />
      </div>
      <div className='w-[55%]'>
        <Form />
      </div>
   </div>
  )
}

export default Index