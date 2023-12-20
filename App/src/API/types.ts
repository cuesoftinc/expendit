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

export interface LogoutProps {
  router: AppRouterInstance;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

export interface IncomeProps {
  completeForm: IncomePayload;
  setFormError: Dispatch<SetStateAction<string>>;
  setFormSuccess: Dispatch<SetStateAction<string>>;
  setFormLoading: Dispatch<SetStateAction<boolean>>;
};

export interface IncomePayload {
  Source: string;
  Amount: number;
  Description: string;
  User_type?: string;
};

export interface PasswordChangeProps {
  completeForm: PasswordPayload;
  setFormError: Dispatch<SetStateAction<string>>;
  setFormSuccess: Dispatch<SetStateAction<string>>;
  setFormLoading: Dispatch<SetStateAction<boolean>>;
};

export interface PasswordPayload {
  OldPassword: string;
  NewPassword: string;
}

export interface ExpenseProps {
  completeForm: ExpensePayload;
  setFormError: Dispatch<SetStateAction<string>>;
  setFormSuccess: Dispatch<SetStateAction<string>>;
  setFormLoading: Dispatch<SetStateAction<boolean>>;
};

export interface ExpensePayload {
  Amount: number;
  Category: string;
  Note: string;
};

export interface CategoryProps {
  input?: string;
  id?: string;
  setFormError: React.Dispatch<React.SetStateAction<string>>;
  setFormSuccess: React.Dispatch<React.SetStateAction<string>>;
  setFormLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
