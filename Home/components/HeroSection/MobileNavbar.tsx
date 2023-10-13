"use client"

import React, { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { AiOutlineClose } from 'react-icons/ai';
import styles from './styles';

interface Props {
  setOpenNav: Dispatch<SetStateAction<boolean>>;
};

const MobileNavbar = ({ setOpenNav }: Props) => {
  const navLinks = [ 'Home', 'About us', 'Services'];

  const handleClick = () => {
    setOpenNav(false);
  };

  return (
    <div className={styles.mobileNavCont}>
      <div className={styles.closeNavCont}>
        <AiOutlineClose 
          fontSize={25} 
          className="cursor-pointer" 
          onClick={() => setOpenNav(false)} 
        />
      </div>
      <div className='text-center'>
        <ul className={styles.mobileNavlinks}>
          {navLinks.map((link, index) => (
            <li 
              className='hover:text-purple-600' 
              key={index}
              onClick={handleClick}>
              <Link href="" >{link}</Link>
            </li>
          ))}
        </ul>
        <button 
        type='button' 
        className={styles.btnOne}>Login</button>
      </div>
    </div>
  )
}

export default MobileNavbar