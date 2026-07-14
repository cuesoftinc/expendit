import { userDetailsProps } from "@/components/settings/profile-settings/types";
import { UserDetailsPayload } from "@/api/types";
import { getLocalStorageItem } from "./local-storage";

export function formatUserDetails(obj: userDetailsProps): UserDetailsPayload {
  const user = getLocalStorageItem("Expendit-user") || null;
  const fetchedUser = user ? JSON.parse(user) : null;

  return {
    first_name: obj.first_name,
    last_name: obj.last_name,
    email: fetchedUser.email,
    phone: fetchedUser.phone,
    password: fetchedUser.password,
    user_type: fetchedUser.user_type,
    updated_at: fetchedUser.updated_at,
  };
}

export const userDetailsRequiredFields = ["first_name", "last_name"];
