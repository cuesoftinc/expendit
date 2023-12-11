"use client"

import React, { useState } from 'react';
import Image from 'next/image';
import { AiOutlineMenu } from 'react-icons/ai';
import Link from 'next/link';
import Logo from '@/assets/images/logo2.png';
import Chart from '@/assets/images/expendit_hero.png';
import MobileNavbar from './MobileNavbar';
import { useCustomState } from '@/hooks/responsive';
import styles from './styles';

export const navLinks = [ 
  {
    title: 'Home',
    url: "#home"
  },
  {
    title: 'About us',
    url: "#about"
  },
  {
    title: 'Services',
    url: "#services"
  },
  {
    title: 'Contact',
    url: "#contact"
  },
];

const HeroSection = () => {
  const [ openNav, setOpenNav ] = useState<boolean>(false);
  const [ mobile ] = useCustomState(setOpenNav);

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
                <Link href={link.url} >{link.title}</Link>
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
        <div className='lg:w-[55%] w-full'>
          <h1 className={styles.header}>
            Empower Your Finances 
            <br /> with <span className='text-purpleTheme'>Expendit</span>: 
            <br />Expense Management 
            <br /> Made Simple.
          </h1>
          <p className={styles.subtext}>
            Discover a smarter way to manage your money, effortlessly. 
            Whether you&apos;re a budgeting pro or just getting started, 
            Expendit is here to empower you.
          </p>
          <div className='flex gap-3 items-center'>
            <button type='button' className={styles.btnTwo}>sign up</button>
            <button type='button' className={styles.btnThree}>self-host</button>
          </div>
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