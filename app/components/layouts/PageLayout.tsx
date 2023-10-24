"use client"
import React, { ReactNode, Fragment } from 'react';
import { useNavContext } from '@/context';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import styles from './styles';

const PageLayout = ({ children}: { children: ReactNode }) => {
  const { isNavOpen } = useNavContext();

  return (
    <Fragment>
      <Sidebar />
      {isNavOpen && <MobileSidebar />}
      <div className={styles.pageContainer}>
        <Navbar />
        {children}
      </div>
    </Fragment>
  )
}

export default PageLayout