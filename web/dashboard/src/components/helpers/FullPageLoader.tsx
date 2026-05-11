"use client"

import React from 'react';
import LoaderSpinner from './LoaderSpinner';
import styles from './styles';

const FullPageLoader = () => {
  return (
    <div className={styles.fullLoader}>
      <LoaderSpinner 
        style='spin' 
        variant='spin-bigger' 
      />
    </div>
  )
}

export default FullPageLoader