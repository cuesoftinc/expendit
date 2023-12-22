import React from 'react';
import PageLayout from "@/components/layouts/PageLayout";
import styles from '@/components/CustomStyles';
import Page from '@/components/history';
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

const History = () => {
  return (
    <ProtectedRoute>
      <PageLayout>
        <main className={styles.pagePad}>
          <Page />
        </main>
      </PageLayout>
    </ProtectedRoute>
  )
}

export default History