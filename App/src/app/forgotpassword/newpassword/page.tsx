"use client"

import React from 'react';
import Page from '@/components/forgotpassword/newpassword';
import styles from '@/components/CustomStyles';
import { PublicRoute } from '@/components/helpers/RouteProtection';

const ForgotPassword: React.FC = () => {
  return (
    <main className={styles.pagePad}>
      <PublicRoute>
        <Page newpassword={''} confirmpassword={''} />
      </PublicRoute>
    </main>
  );
}

export default ForgotPassword;
