import React, { Suspense } from "react";
import { PublicRoute } from "@/components/helpers/RouteProtection";
import NewPasswordPage from "@/components/forgot-password/NewPassword";

const Page = () => {
  return (
    <PublicRoute>
      <Suspense fallback={null}>
        <NewPasswordPage />
      </Suspense>
    </PublicRoute>
  );
};

export default Page;
