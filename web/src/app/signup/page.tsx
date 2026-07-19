import { redirect } from "next/navigation";

// X-1: Google-only auth — /signup redirects to the single auth screen
// (flows/auth.md §1 acceptance).
const Signup = () => {
  redirect("/signin");
};

export default Signup;
