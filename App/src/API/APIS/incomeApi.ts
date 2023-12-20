import { API } from '../axiosSetup';
import { IncomeProps } from '../types';
import { getLocalStorageItem } from '@/utils/localStorage';

const userID = getLocalStorageItem('Expendit-user') || null;
const user_id = userID ? JSON.parse(userID) : null;

export const incomeCreateApi = async ({
  completeForm,
  setFormError,
  setFormSuccess,
  setFormLoading,
}: IncomeProps) => {
  setFormLoading(true);

  try {
    const payload = JSON.stringify(completeForm)
    const { data, status } = await API.post('/income/create', payload);

    if (data && status === 201) {
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
    const { data, status } = await API.get(`/income/incomes/month/${user_id}`);

    if (data) {
      console.log(data);

      return data;
    }
  } catch (error) {
    console.log(error)
  }
}