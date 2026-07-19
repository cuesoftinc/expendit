import { redirect } from "next/navigation";

// Route canon (web-implementation.md §4/§8): the legacy flat /categories
// screen is superseded by the nested dashboard area; the quarantined
// original lives in src/legacy/app/categories/ pending its retirement PR.
const LegacyRedirect = () => {
  redirect("/dashboard/categories");
};

export default LegacyRedirect;
