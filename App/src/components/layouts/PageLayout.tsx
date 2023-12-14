"use client"
import React, { ReactNode, Fragment, useEffect } from 'react';
import { useNavContext, useHomeContext } from '@/context';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import Notification from '../helpers/Notification';
import FullPageLoader from '../helpers/FullPageLoader';
import styles from './styles';

const PageLayout = ({ children}: { children: ReactNode }) => {
  const { isNavOpen, user } = useNavContext();
  const { formError, formSuccess, formLoading, setFormLoading } = useHomeContext();

  // if(formLoading) return (<FullPageLoader />);

  return (
    <Fragment>
      {formError !== "" && <Notification msg={formError} type="error" />}
      {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
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