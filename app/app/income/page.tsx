import React from 'react';
import PageLayout from '@/components/layouts/PageLayout'
import Page from '@/components/income';
import styles from '@/components/CustomStyles';

const Income = () => {
  return (
    <PageLayout>
      <main className={styles.pagePad}>
       <Page />
      </main>
    </PageLayout>
  )
}

export default Income