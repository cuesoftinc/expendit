import { redirect } from "next/navigation";

// Route canon (web-implementation.md §4/§8): the flat /income path
// redirects to its nested dashboard area — old links keep working.
const LegacyRedirect = () => {
  redirect("/dashboard/transactions");
};

export default LegacyRedirect;
