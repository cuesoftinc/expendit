import { redirect } from "next/navigation";

// X-1: Google-only auth — the legacy password signup route is retired and
// redirects to the single auth screen (flows/auth.md §1 acceptance).
// The old page lives in src/legacy/app/signup/ pending its retirement PR.
const Signup = () => {
  redirect("/signin");
};

export default Signup;
