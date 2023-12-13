"use client"

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AiOutlineMenu } from "react-icons/ai";
import { BsSearch } from "react-icons/bs";
import { MdKeyboardArrowDown, MdAdd } from "react-icons/md";

import styles from './styles';
import { useNavContext } from '@/context';
import UserProfile from './UserProfile';
import { getUserApi } from '@/API/APIS/userApi';
import Avatar from '@/assets/images/avatar.jpg';
import FullPageLoader from '../helpers/FullPageLoader';


const Navbar = () => {
  const { 
    isProfileOpen, 
    setIsProfileOpen, 
    setIsNavOpen, 
    setUser, 
    user 
  } = useNavContext();
  const handleClick = () => { setIsProfileOpen(true)};
  const picture = null;
 
  useEffect(() => {
    async function populateUser(){
      const userData = await getUserApi();

      if(userData !== undefined) setUser(userData);
    };

    (async () => populateUser())();
  }, []);

  if(user === null) return <FullPageLoader />;

  return (
    <div className={styles.navCont}>
      <div className={styles.center}>
        <button className={styles.menu} onClick={() => setIsNavOpen(true)}>
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
          <div className={styles.imgCont}>
          {picture ? <Image src={Avatar} 
            alt="userProfile" 
            className='rounded-full w-8 h-8'
            />
          : <p className={styles.imgText}>{user?.first_name.charAt(0)}</p>}
          </div>
          <p className={styles.text}>{`Hi ${user?.first_name}`}</p>
        </div>
      </div>
      {isProfileOpen && (<UserProfile />)}
    </div>
  )
}

export default Navbar