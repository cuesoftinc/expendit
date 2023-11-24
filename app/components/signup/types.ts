export interface inputProps {
  name: string; 
  type: string;
  value: string; 
  placeholder: string;
  handleChange: (e: any) => void; 
  label: string;
  custom?: boolean;
};

export interface signUpFormProps {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
};