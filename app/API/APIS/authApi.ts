import { API } from '../axiosSetup'
import { signUpForm } from '@/components/signup/types'

interface props {
  form: signUpForm;
};

export const signUpApi = async ({ form }: props) => {
  console.log(form);
  const response = await API.post('/users/signup', { form });

  console.log(response);
}