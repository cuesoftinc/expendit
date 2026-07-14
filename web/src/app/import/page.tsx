import React from "react";
import PageLayout from "@/components/layouts/PageLayout";
import ImportPage from "@/components/import";
import styles from "@/components/custom-styles";
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

const Import = () => {
  return (
    <ProtectedRoute>
      <PageLayout>
        <main className={styles.pagePad}>
          <ImportPage />
        </main>
      </PageLayout>
    </ProtectedRoute>
  );
};

export default Import;
