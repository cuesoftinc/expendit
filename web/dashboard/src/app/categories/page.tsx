"use client"

import React from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import Page from '@/components/categories'
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

const Categories: React.FC = () => {
  return (
    <ProtectedRoute>
      <PageLayout>
        <Page/>
      </PageLayout>
    </ProtectedRoute>
  );
}

export default Categories;
