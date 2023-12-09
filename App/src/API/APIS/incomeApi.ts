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
    console.log(completeForm)
    const {data, status } = await API.post('/income/create', payload);

    if(data && status === 200){
      setFormSuccess("Successful!");
      setFormLoading(false);

      console.log(data);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
    console.log(error)
  }
}