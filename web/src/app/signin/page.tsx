import React from "react";
import SigninView from "./SigninView";

// X-1: the single auth screen — Google-only (flows/auth.md §1).
export const metadata = {
  title: "Sign in — Expendit",
  description: "Sign in to Expendit with Google",
};

const SignIn = () => {
  return <SigninView />;
};

export default SignIn;
