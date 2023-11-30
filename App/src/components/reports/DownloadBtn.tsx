import React from 'react';
import { CiImport } from 'react-icons/ci';
import styles from './styles';
import { useCustomState } from '@/hooks/responsive';

const DownloadBtn = () => {
  const [ mobile ] = useCustomState();

  return (
    <button type="button" className={styles.btn}>
      <CiImport fontSize={20} />
      {!mobile ? <p>Download excel</p> : null}
    </button>
  )
}

export default DownloadBtn