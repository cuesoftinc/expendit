import { passwordChangeProps } from "@/components/settings/password-settings/types";
import { PasswordPayload } from "@/api/types";

export function formatPasswordChange(
  obj: passwordChangeProps,
): PasswordPayload {
  return {
    old_password: obj.old_password,
    new_password: obj.new_password,
    confirm_password: obj.confirm_password,
  };
}

export const passwordRequiredFields = [
  "old_password",
  "new_password",
  "confirm_password",
];
