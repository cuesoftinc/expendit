"use client"

import React from 'react';
import Page from '@/components/forgotpassword';
import styles from '@/components/CustomStyles';
import { PublicRoute } from '@/components/helpers/RouteProtection';

const ForgotPassword: React.FC = () => {
  return (
    <main className={styles.pagePad}>
      <PublicRoute>
        <Page />
      </PublicRoute>
    </main>
  );
}

export default ForgotPassword;
