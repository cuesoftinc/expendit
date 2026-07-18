import React from "react";
import SigninView from "./SigninView";

// X-1: the single auth screen — Google-only (flows/auth.md §1). The legacy
// password signin lives in src/legacy/app/signin/ pending its retirement PR.
export const metadata = {
  title: "Expendit | Sign in",
  description: "Sign in to Expendit with Google",
};

const SignIn = () => {
  return <SigninView />;
};

export default SignIn;
