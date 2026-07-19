import { redirect } from "next/navigation";

// Route canon (web-implementation.md §4/§8): the legacy flat /import
// screen is superseded by the nested dashboard area; the quarantined
// original lives in src/legacy/app/import/ pending its retirement PR.
const LegacyRedirect = () => {
  redirect("/dashboard/imports");
};

export default LegacyRedirect;
