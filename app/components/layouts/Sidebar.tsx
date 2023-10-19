"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import { AiOutlinePoweroff } from 'react-icons/ai';
import { links } from '@/dummy';
import { useNavContext } from '@/context';
import styles from './styles';
import Image from 'next/image';
import Logo from '@/assets/images/logo.png';

const Sidebar = () => {
  const { isNavOpen, setIsNavOpen,  navState, setNavState, } = useNavContext();
  const pathname = usePathname();

  return (
    <div className={styles.container}>
      <Link href="/dashboard" className=''>
        <Image 
          src={Logo} 
          alt='Expendit Logo' 
          width={80} 
          className='ml-5 mt-4' 
        />
      </Link>
  
      <div className='relative mt-10'>
        {links.map((link, index) => (
          <Link
            href={link.url}
            key={link.name}
            onClick={() => {}}
            className={styles.link(pathname, link.url)}
          >
            <span className='text-xl'>{link.icon}</span>
            <span>{link.name}</span> 
          </Link>
        ))}
      </div>
      <div className={styles.logout} 
        onClick={() => {}}>
        <AiOutlinePoweroff className='mr-3'/>
        <span className='font-semibold '>Logout</span>
      </div>
    </div>
  )
}

export default Sidebar