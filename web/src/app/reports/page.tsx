import { redirect } from "next/navigation";

// Route canon (web-implementation.md §4/§8): the flat /reports path
// redirects to its nested dashboard area — old links keep working.
const LegacyRedirect = () => {
  redirect("/dashboard/reports");
};

export default LegacyRedirect;
