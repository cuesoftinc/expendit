export interface inputProps {
  name: string; 
  type: string;
  value: string; 
  placeholder: string;
  handleChange: (e: any) => void; 
  label: string;
  custom?: boolean;
};

export interface signInFormProps {
  email: string;
  password: string;
};