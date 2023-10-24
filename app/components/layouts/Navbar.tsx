"use client"

import React from 'react';
import Image from 'next/image';
import { AiOutlineMenu } from "react-icons/ai";
import { BsSearch } from "react-icons/bs";
import { MdKeyboardArrowDown, MdAdd } from "react-icons/md";

import styles from './styles';
import { useNavContext } from '@/context';
import UserProfile from './UserProfile';
import Avatar from '@/assets/images/avatar.jpg'


const Navbar = () => {
  const { isProfileOpen, setIsProfileOpen, setIsNavOpen } = useNavContext();

  const handleClick = () => { setIsProfileOpen(true)};

  return (
    <div className={styles.navCont}>
      <div className={styles.center}>
        <button className='block md:hidden ml-2' onClick={() => setIsNavOpen(true)}>
          <AiOutlineMenu fontSize={25} />
        </button>
        <span><BsSearch className={styles.searchIcon} /></span>
        <input 
          type="text" 
          className={styles.navInput} 
          placeholder='search Anything...' 
        />
      </div>

      <div className="flex gap-5 text-gray-500">
        <button className={styles.navBtn}>
          <span >Add</span>
          <MdAdd fontSize={20}/>
        </button>
        <div className={styles.profileCont}
          onClick={() => handleClick()}>
          <Image src={Avatar} 
          alt="userProfile" 
          className='rounded-full w-8 h-8'
          />
          <p className='md:block hidden'>Hi Femi</p>
          <MdKeyboardArrowDown />
        </div>
      </div>
      {isProfileOpen && (<UserProfile />)}
    </div>
  )
}

export default Navbar