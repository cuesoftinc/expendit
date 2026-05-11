import React from 'react'
import Logo from '@/assets/images/logo.png';
import Image from 'next/image';
import styles from "./styles";
import ArrowRight from '../../assets/icons/arrow_right.svg';

const Footer = () => {
  return (
    <div className={styles.container}>
      <div className={styles.copyright}>
        <p>© 2023 Copyright: All rights reserved</p>
      </div>
      <div className={styles.grid}>
        <div className={styles.first_col}>
          <div className={styles.logo}>
            <Image src={Logo} alt="Expendit Logo" width="100" className='invert' />
          </div>
          <button type="button" 
            className={styles.donate}>
            <p className={styles.donate_text}>Donate Now</p>
            <Image src={ArrowRight} alt="arrow right icon" className='invert' />
          </button>
        </div>
        <div className='pb-6'>
          <p className='font-bold mb-3 text-lg'>Overview</p>
          <p className='my-4'>Services</p>
          <p className='my-4'>Who we are</p>
          <p className='my-4'>Resources</p>
        </div>
        <div className='md:mx-0 pb-6'>
          <p className='font-bold mb-3 text-lg'>Legal</p>
          <p className='my-4'>Privacy policy</p>
          <p className='my-4'>Terms of use</p>
          <p className='my-4'>Cookie Policy</p>
        </div>
        <div className='pb-6'>
          <p className='font-bold mb-3 text-lg'>Business Info</p>
          <p className='my-4'>39 Alfred Rewane Road, Mulliner Towers,<br /> Ikoyi, 101233, Lagos, Nigeria</p>
          <p className='my-4'>info@expendit.com</p>
        </div>
      </div>
    </div>
  )
}

export default Footer