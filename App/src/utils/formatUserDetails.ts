import { userDetailsProps } from "@/components/settings/ProfileSettings/types";
import { UserDetailsPayload } from "@/API/types";

export function formatUserDetails( obj: userDetailsProps ): UserDetailsPayload {
  return {
    FirstName: obj.firstName,
    LastName: obj.lastName,
    Email: obj.email,
  };
}

export const userDetailsRequiredFields = [
  "Email",
  "FirstName",
  "LastName"
];