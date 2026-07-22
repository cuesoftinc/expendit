import React from "react";
import SignInGate from "./SignInGate";
import SigninView from "./SigninView";

// X-1: the single auth screen — Google-only (flows/auth.md §1). SignInGate
// is the flows/auth.md §2 reverse guard: a signed-in visitor is replaced
// to /dashboard and never sees this screen; the page stays a server
// component (metadata intact).
export const metadata = {
  title: "Sign in — Expendit",
  description: "Sign in to Expendit with Google",
};

const SignIn = () => {
  return (
    <SignInGate>
      <SigninView />
    </SignInGate>
  );
};

export default SignIn;
