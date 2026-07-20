import { redirect } from "next/navigation";
import { FIRST_SETTINGS_TAB } from "./tabs";

/**
 * B9 `/dashboard/settings` — live IA (user-ratified 2026-07-20): the
 * bare route lands on the first settings tab; every section is a routed
 * tab at /dashboard/settings/<tab>.
 */
export default function SettingsPage() {
  redirect(FIRST_SETTINGS_TAB);
}
