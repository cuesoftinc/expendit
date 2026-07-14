import React, { Suspense } from "react";
import Page from "@/components/forgotpassword";
import styles from "@/components/custom-styles";
import { PublicRoute } from "@/components/helpers/RouteProtection";

const ForgotPassword = () => {
  return (
    <PublicRoute>
      <main className={styles.pagePad}>
        <Suspense fallback={null}>
          <Page />
        </Suspense>
      </main>
    </PublicRoute>
  );
};

export default ForgotPassword;
