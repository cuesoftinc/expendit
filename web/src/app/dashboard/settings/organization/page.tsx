import React from "react";
import { AppearanceSection, OrganizationSection } from "../sections";

/**
 * B9 — Organization tab (user-ratified 2026-07-20): org profile (name,
 * registered address, fiscal year end) with the Appearance card as the
 * tail (B9b frame reference).
 */
export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-4">
      <OrganizationSection />
      <AppearanceSection />
    </div>
  );
}
