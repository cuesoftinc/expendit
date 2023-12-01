import React from 'react';
import Page from '@/components/signin/Index';
import { PublicRoute } from '@/components/helpers/RouteProtection';

export const metadata = {
  title: 'Expendit | Sign-in',
  description: 'Expendit Sign-in page',
};

const SignIn = () => {
  return (
    <PublicRoute>
      <Page />
    </PublicRoute>
  )
}

export default SignIn
