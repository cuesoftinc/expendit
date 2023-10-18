import React, { ReactNode } from 'react';
import styles from './styles';

const PageLayout = ({ children}: { children: ReactNode }) => {

  return (
    <div className={styles.pageContainer}>
      {children}
    </div>
  )
}

export default PageLayout