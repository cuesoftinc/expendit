import React from 'react';
import PageLayout from "@/components/layouts/PageLayout";
import styles from '@/components/CustomStyles';
import ExpenseComparisonByCat from '@/components/reports/ExpenseComparisonByCat';
import ExpenseCompositionByCat from '@/components/reports/ExpenseCompositionByCat';
import ExpenseTrends from '@/components/reports/ExpenseTrends';
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

const Reports = () => {
  return (
    <ProtectedRoute>
      <PageLayout>
        <main className={styles.pagePad}>
        <ExpenseCompositionByCat />
        <ExpenseTrends />
        <ExpenseComparisonByCat />
        </main>
      </PageLayout>
    </ProtectedRoute>
  )
}

export default Reports
