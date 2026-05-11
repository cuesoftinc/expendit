import React from 'react';
import Page from '@/components/forgotpassword';
import styles from '@/components/CustomStyles';
import { PublicRoute } from '@/components/helpers/RouteProtection';

const ForgotPassword = () => {
  return (
    <PublicRoute>
      <main className={styles.pagePad}>
        <Page />
      </main>
    </PublicRoute>
  );
}

export default ForgotPassword;
