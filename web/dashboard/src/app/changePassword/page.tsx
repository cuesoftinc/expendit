import React from 'react';
import { PublicRoute } from '@/components/helpers/RouteProtection';

export const metadata = {
  title: 'Expendit | New Password',
  description: 'Expendit New Password page',
};

const Page = () => {
  return (
    <PublicRoute>
      <div>Hello new password alone</div>
    </PublicRoute>
  )
}

export default Page