import { passwordChangeProps } from "@/components/settings/PasswordSettings/types";
import { PasswordPayload } from "@/API/types";

export function formatPasswordChange( obj: passwordChangeProps ): PasswordPayload {
  return {
    OldPassword: obj.old_password,
    NewPassword: obj.new_password,
  };
}

export const passwordRequiredFields = [
  "OldPassword",
  "NewPassword",
];
