import React from 'react';
import PageLayout from '@/components/layouts/PageLayout'
import Page from '@/components/income';
import styles from '@/components/CustomStyles';
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

const Income = () => {
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

export default Income