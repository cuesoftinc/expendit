import { signInFormProps } from "@/components/signin/types";
import { SignInPayload } from "@/API/types";

export function formatSignIn( obj: signInFormProps ): SignInPayload {
  return {
    Email: obj.email,
    Password: obj.password,
    User_type: "USER"
  };
}

export const signInRequiredFields = [
  "Email",
  "Password",
];


