import React from 'react';
import { PublicRoute } from '@/components/helpers/RouteProtection';
import NewPasswordPage from '@/components/forgotpassword/newpassword';

const Page = () => {
  return (
    <PublicRoute>
      <NewPasswordPage />
    </PublicRoute>
  )
}

export default Page