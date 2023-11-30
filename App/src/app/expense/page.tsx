import React from 'react';
import PageLayout from "@/components/layouts/PageLayout";
import Page from '@/components/expense';
import styles from '@/components/CustomStyles';

const Expense = () => {
  return (
    <PageLayout>
      <main className={styles.pagePad}>
       <Page />
      </main>
    </PageLayout>
  )
}

export default Expense
