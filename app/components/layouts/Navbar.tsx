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
  const { isProfileOpen, setIsProfileOpen } = useNavContext();

  const handleClick = () => { setIsProfileOpen(true)};

  return (
    <div className={styles.navCont}>
      <div className={styles.center}>
        {/* <button>
          <AiOutlineMenu />
        </button> */}
        <span><BsSearch className={styles.searchIcon} /></span>
        <input 
          type="text" 
          className={styles.navInput} 
          placeholder='search Anything...' 
        />
      </div>

      <div className="flex gap-5">
        <button className={styles.navBtn}>
          <span>Add</span>
          <MdAdd fontSize={20}/>
        </button>
        <div className={styles.profileCont}
          onClick={() => handleClick()}>
          <Image src={Avatar} 
          alt="userProfile" 
          className='rounded-full w-8 h-8'
          />
          <MdKeyboardArrowDown 
            className='text-gray-400 text-14'
          />
        </div>
      </div>
      {isProfileOpen && (<UserProfile />)}
    </div>
  )
}

export default Navbar