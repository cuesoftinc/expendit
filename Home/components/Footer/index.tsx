import React from 'react'
import Logo from '@/assets/images/logo-white.png';
import Image from 'next/image';
import styles from "./styles"

const Footer = () => {
  return (
    <div className={styles.container}>
      <div className={styles.copyright}>
        <p>© 2023 Copyright: All rights reserved</p>
      </div>
      <div className={styles.grid}>
        <div className={styles.logo}>
          <Image src={Logo} alt="Expendit Logo" width="100" />
        </div>
        <div className='pb-6'>
          <p className='font-bold mb-3'>Overview</p>
          <p className='mb-2'>Services</p>
          <p className='mb-2'>Who we are</p>
          <p className='mb-2'>Resources</p>
        </div>
        <div className='mx-auto md:mx-0 pb-6'>
          <p className='font-bold mb-3'>Legal</p>
          <p className='mb-2'>Privacy policy</p>
          <p className='mb-2'>Terms of use</p>
          <p className='mb-2'>Cookie Policy</p>
        </div>
        <div className='mx-auto pb-6'>
          <p className='font-bold mb-3'>Business Info</p>
          <p className='mb-2'>39 Alfred Rewane Road, Mulliner Towers, Ikoyi, 101233, Lagos, Nigeria</p>
          <p className='mb-2'>info@expendit.com</p>
        </div>
      </div>
    </div>
  )
}

export default Footer