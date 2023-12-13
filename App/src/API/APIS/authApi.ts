import { API } from '../axiosSetup';
import { SignUpProps, SignInProps, LogoutProps, PasswordChangeProps } from '../types';

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

      router.push('/signin');
      console.log(data);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
    console.log(error)
  }
  
}

export const signInApi = async ({ 
  completeForm, 
  setFormError, 
  setFormSuccess, 
  setFormLoading,
  router 
}: SignInProps) => {

  try {
    const payload = JSON.stringify(completeForm)
    const {data, status } = await API.post('/users/signin', payload);

    if(data && status === 200){
      setFormSuccess("Successful!");
      setFormLoading(false);

      const jwt = data.token;
      const user_id = data.user_id;
      localStorage.setItem('Expendit-token', JSON.stringify(jwt));
      localStorage.setItem('Expendit-user', JSON.stringify(user_id));
      localStorage.setItem('ExpenditLoggedIn', JSON.stringify(true));

      router.push('/');

      // const userId = data.ID;
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
  }
  
}

export const logoutApi = async ({router, setIsLoading }: LogoutProps) => {
  try {
    setIsLoading(true);
    localStorage.removeItem("Expendit-token");
    localStorage.removeItem("Expendit-user");
    localStorage.removeItem("ExpenditLoggedIn");

    router.push("/signin");
    setIsLoading(false);
  } catch (error) {
    console.log(error);
    setIsLoading(false);
  }
}

export const passwordChangeApi = async ({ 
  completeForm, 
  setFormError, 
  setFormSuccess, 
  setFormLoading,
}: PasswordChangeProps) => {

  try {
    const payload = JSON.stringify(completeForm)
    const {data, status } = await API.post('/users/change-password', payload);

    if(data && status === 200){
      setFormSuccess("Successful!");
      setFormLoading(false);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
  }
  
}