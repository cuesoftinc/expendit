import { API } from '../axiosSetup';
import { SignUpProps, SignInProps, LogoutProps } from '../types';

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
      console.log(jwt);
      localStorage.setItem('Expendit-token', JSON.stringify(jwt));
      localStorage.setItem('ExpenditLoggedIn', JSON.stringify(true));


      router.push('/');
      console.log(data);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
    console.log(error)
  }
  
}

export const logoutApi = async ({router, setIsLoading }: LogoutProps) => {
  try {
    setIsLoading(true);
    localStorage.removeItem("Expendit-token");
    localStorage.removeItem("ExpenditLoggedIn");

    router.push("/signin");
    setIsLoading(false);
  } catch (error) {
    console.log(error);
    setIsLoading(false);
  }
}