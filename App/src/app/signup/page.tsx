import React from 'react';
import Page from '@/components/signup/Index';
import { PublicRoute } from '@/components/helpers/RouteProtection';

export const metadata = {
  title: 'Expendit | Sign-up',
  description: 'Expendit Sign-up page',
};

const Signup = () => {
  return (
    <PublicRoute>
      <Page />
    </PublicRoute>
  )
}

export default Signup
