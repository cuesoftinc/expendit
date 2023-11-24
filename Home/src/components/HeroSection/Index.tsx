"use client"

import React, { useState } from 'react';
import Image from 'next/image';
import { AiOutlineMenu } from 'react-icons/ai';
import Link from 'next/link';
import Logo from '@/assets/images/logo2.png';
import Chart from '@/assets/images/chart4.png';
import MobileNavbar from './MobileNavbar';
import { useCustomState } from '@/hooks/responsive';

import styles from './styles';

const HeroSection = () => {
  const [ openNav, setOpenNav ] = useState<boolean>(false);
  const [ mobile ] = useCustomState(setOpenNav);
  const navLinks = [ 'Home', 'About us', 'Services', 'Contact'];

  return (
    <section className={styles.heroContainer} id='home'>
      <nav className={styles.navContainer}>
        <Image src={Logo} alt="Expendit Logo" width={mobile ? 80 : 100} />
        {!mobile && 
          <ul className={styles.navLinksContainer}>
            {navLinks.map((link, index) => (
              <li 
                className='hover:text-purple-600' 
                key={index}>
                <Link href="" >{link}</Link>
              </li>
            ))}
          </ul>
        }
        {!mobile 
        && <button 
        type='button' 
        className={styles.btnOne}>Login</button>}
        {mobile 
        && <AiOutlineMenu 
          onClick={() => setOpenNav(true)} 
          fontSize={30} 
          className='cursor-pointer' 
          />
        }
      </nav>
      <div className={styles.heroSection}>
        <div className='md:w-[55%] w-full'>
          <h1 className={styles.header}>
            Empower Your Finances 
            <br />with <span className='text-purpleTheme'>Expendit</span>: Expense  
            <br /> Management Made Simple.
          </h1>
          <p className={styles.subtext}>
            Discover a smarter way to manage your money, effortlessly. 
            Whether you&apos;re a budgeting pro or just getting started, 
            Expendit is here to empower you.
          </p>
          <button type='button' className={styles.btnTwo}>Sign up</button>
        </div>
        <div className={styles.imgContainer}>
          <Image src={Chart} alt='Line Chart' className={styles.img} />
        </div>
      </div>
      {openNav && <MobileNavbar setOpenNav={setOpenNav} />}
    </section>
  )
}

export default HeroSection