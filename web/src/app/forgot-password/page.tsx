import { redirect } from "next/navigation";

// X-1: Google-only auth — password reset no longer exists; the route
// redirects to the single auth screen (flows/auth.md §1 acceptance).
// The old page lives in src/legacy/app/forgot-password/ pending retirement.
const ForgotPassword = () => {
  redirect("/signin");
};

export default ForgotPassword;
