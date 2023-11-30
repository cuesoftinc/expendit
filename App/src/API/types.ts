import { Dispatch, SetStateAction } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface SignUpPayload {
  First_name: string;
  Last_name: string;
  Email: string;
  Password: string;
  Phone: string;
  User_type?: string;
}

export interface SignUpProps {
  completeForm: SignUpPayload;
  setFormError: Dispatch<SetStateAction<string>>;
  setFormSuccess: Dispatch<SetStateAction<string>>;
  setFormLoading: Dispatch<SetStateAction<boolean>>;
  router: AppRouterInstance;
};

export interface SignInPayload {
  Email: string;
  Password: string;
  User_type?: string;
}

export interface SignInProps {
  completeForm: SignInPayload;
  setFormError: Dispatch<SetStateAction<string>>;
  setFormSuccess: Dispatch<SetStateAction<string>>;
  setFormLoading: Dispatch<SetStateAction<boolean>>;
  router: AppRouterInstance;
};