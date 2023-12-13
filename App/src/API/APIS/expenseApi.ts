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
  const response = await API.get('/expense/search');
  console.log(response)
}

export const expenseDeleteApi = async () => {

}

export const expenseEditApi = async () => {
  
}