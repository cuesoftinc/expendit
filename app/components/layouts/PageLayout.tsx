import React, { ReactNode, Fragment } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import styles from './styles';

const PageLayout = ({ children}: { children: ReactNode }) => {

  return (
    <Fragment>
      <Sidebar />
      <div className={styles.pageContainer}>
        <Navbar />
        {children}
      </div>
    </Fragment>
  )
}

export default PageLayout