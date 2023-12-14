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

export const getExpenseApi = async () => {
  try {
    const { data } = await API.get('/expense');
    console.log(data)

    if(data){
      return data;
    }
  } catch (error) {
    
  }
}

export const deleteExpenseApi = async () => {

}

export const editExpenseApi = async () => {
  
}