"use client";

/**
 * Org context — one org controller instance shared across the dashboard
 * shell and every screen (pages.md Part B: org switcher atop nav; api.md
 * §5 X-Org-Id context). Controllers own state; views consume via useOrg().
 */

import React, { createContext, useContext } from "react";
import { useOrgController } from "./use-org";

type OrgContextValue = ReturnType<typeof useOrgController>;

const OrgContext = createContext<OrgContextValue | null>(null);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const controller = useOrgController();
  return (
    <OrgContext.Provider value={controller}>{children}</OrgContext.Provider>
  );
};

export const useOrg = (): OrgContextValue => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
};
