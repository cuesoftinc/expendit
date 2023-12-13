import { API } from '../axiosSetup';
import { IncomeProps } from '../types';

export const incomeCreateApi = async ({
  completeForm, 
  setFormError, 
  setFormSuccess, 
  setFormLoading,
} : IncomeProps) => {
  try {
    const payload = JSON.stringify(completeForm)
    const { data, status } = await API.post('/income/create', payload);

    if(data && status === 201){
      setFormSuccess("Successful!");
      setFormLoading(false);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
  }
}

export const getIncomeApi = async () => {
  try {
    const { data, status } = await API.get('/income');

    if(data){
      console.log(data);

      return data;
    }
  } catch (error) {
    
  }
}