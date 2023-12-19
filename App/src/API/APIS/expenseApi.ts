import { API } from '../axiosSetup';
import { ExpenseProps } from '../types';

export const expenseCreateApi = async ({
  completeForm,
  setFormError,
  setFormSuccess,
  setFormLoading,
}: ExpenseProps) => {
  try {
    const payload = JSON.stringify(completeForm)
    console.log(completeForm)
    const { data, status } = await API.post('/expense/create', payload);

    if (data && status === 201) {
      console.log(data)
      setFormSuccess("Successful!");
      setFormLoading(false);
    }
  } catch (error) {
    console.log(error)
    setFormError("an error occurred, try again");
    setFormLoading(false);
  }
}

export const getExpenseApi = async () => {
  try {
    const { data } = await API.get('/expense?page=1&per_page=10');

    if (data) {
      return data;
    }
  } catch (error) {

  }
}

export const deleteExpenseApi = async () => {

}

export const editExpenseApi = async () => {

}