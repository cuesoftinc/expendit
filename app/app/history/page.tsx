import React from 'react';
import PageLayout from "@/components/layouts/PageLayout";
import styles from '@/components/CustomStyles';
import Page from '@/components/history';

const History = () => {
  return (
    <PageLayout>
      <main className={styles.pagePad}>
        <Page />
      </main>
    </PageLayout>
  )
}

export default History