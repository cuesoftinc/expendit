import { API } from '../axiosSetup'
import { SignUpProps } from '../types';

export const signUpApi = async ({ 
  completeForm, 
  setFormError, 
  setFormSuccess, 
  setFormLoading,
  router 
}: SignUpProps) => {

  try {
    const payload = JSON.stringify(completeForm)
    const {data, status } = await API.post('/users/signup', payload);

    if(data && status === 200){
      setFormSuccess("Successful!");
      setFormLoading(false);

      router.push('/login');
      console.log(data);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
    console.log(error)
  }
  
}