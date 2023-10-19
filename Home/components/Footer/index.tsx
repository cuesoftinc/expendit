import React from 'react'
import Logo from '@/assets/images/logo.png';
import Image from 'next/image';

const Footer = () => {
  return (
    <div className='bg-secondary text-white'>
      <div className='flex justify-center py-10 mb-8'>
        <p className='tracking-widest'>© 2023 Copyright: All rights reserved</p>
      </div>
      <div className='grid md:grid-cols-4 grid-cols-2 pb-10'>
        <div className='mx-auto pb-6'>
          <Image src={Logo} alt="Expendit Logo" width="100" className='invert' />
        </div>
        <div className='pb-6'>
          <p className='font-bold mb-3 text-lg'>Overview</p>
          <p className='my-4'>Services</p>
          <p className='my-4'>Who we are</p>
          <p className='my-4'>Resources</p>
        </div>
        <div className='mx-auto md:mx-0 pb-6'>
          <p className='font-bold mb-3 text-lg'>Legal</p>
          <p className='my-4'>Privacy policy</p>
          <p className='my-4'>Terms of use</p>
          <p className='my-4'>Cookie Policy</p>
        </div>
        <div className='mx-auto pb-6'>
          <p className='font-bold mb-3 text-lg'>Business Info</p>
          <p className='my-4'>39 Alfred Rewane Road, Mulliner Towers, Ikoyi, 101233, Lagos, Nigeria</p>
          <p className='my-4'>info@expendit.com</p>
        </div>
      </div>
    </div>
  )
}

export default Footer