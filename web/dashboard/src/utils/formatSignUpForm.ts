import { signUpFormProps } from "@/components/signup/types";
import { SignUpPayload } from "@/API/types";

export function formatSignUp( obj: signUpFormProps ): SignUpPayload {
  return {
    First_name: obj.firstName,
    Last_name: obj.lastName,
    Email: obj.email,
    Password: obj.password,
    Phone: obj.phoneNumber,
    User_type: "USER"
  };
}

export const signUpRequiredFields = [
  "First_name",
  "Last_name",
  "Email",
  "Password",
  "Phone",
];


