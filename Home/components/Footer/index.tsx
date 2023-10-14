import React from 'react'
import Logo from '@/assets/images/logo.png';
import Image from 'next/image';

const Footer = () => {
  return (
    <div className='bg-purple-700 text-gray-300'>
      <div className='flex justify-center py-10'>
        <p>© 2023 Copyright: All rights reserved</p>
      </div>
      <div className='grid md:grid-cols-4 grid-cols-2 pb-10'>
        <div className='mx-auto pb-6'>
          <Image src={Logo} alt="Expendit Logo" width="100" />
        </div>
        <div className='pb-6'>
          <p className='font-bold'>Overview</p>
          <p>Services</p>
          <p>Who we are</p>
          <p>Resources</p>
        </div>
        <div className='mx-auto md:mx-0 pb-6'>
          <p className='font-bold'>Legal</p>
          <p>Privacy policy</p>
          <p>Terms of use</p>
          <p>Cookie Policy</p>
        </div>
        <div className='mx-auto pb-6'>
          <p className='font-bold'>Business Info</p>
          <p>39 Alfred Rewane Road, Mulliner Towers, Ikoyi, 101233, Lagos, Nigeria</p>
          <p>info@expendit.com</p>
        </div>
      </div>
    </div>
  )
}

export default Footer