import { API } from '../axiosSetup';
import { ExpenseProps } from '../types';

export const expenseCreateApi = async ({
  completeForm, 
  setFormError, 
  setFormSuccess, 
  setFormLoading,
} : ExpenseProps) => {
  try {
    const payload = JSON.stringify(completeForm)
    console.log(completeForm)
    const {data, status } = await API.post('/expense/create', payload);

    if(data && status === 200){
      setFormSuccess("Successful!");
      setFormLoading(false);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
  }
}

export const expenseGetApi = async () => {
  try {
    const { data } = await API.get('/expense');

    if(data){
      return data;
    }
  } catch (error) {
    
  }
}

export const expenseDeleteApi = async () => {

}

export const expenseEditApi = async () => {
  
}