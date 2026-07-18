import { redirect } from "next/navigation";

// X-1: Google-only auth — there are no passwords to change; the route
// redirects to the single auth screen (flows/auth.md §1).
const ChangePassword = () => {
  redirect("/signin");
};

export default ChangePassword;
