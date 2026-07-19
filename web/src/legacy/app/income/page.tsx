import React from "react";
import PageLayout from "@/components/layouts/PageLayout";
import Page from "@/components/income/Income";
import styles from "@/components/custom-styles";
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
  );
};

export default Income;
