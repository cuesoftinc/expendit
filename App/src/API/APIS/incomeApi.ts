import { API } from '../axiosSetup';
import { IncomeProps } from '../types';
import { getLocalStorageItem } from '@/utils/localStorage';
import { getBarChartApi } from './reportApi';

const userID = getLocalStorageItem('Expendit-userID') || null;
const user_id = userID ? JSON.parse(userID) : null;

export const incomeCreateApi = async ({
  completeForm,
  setFormError,
  setFormSuccess,
  setFormLoading,
  setPresentIncome,
  setBarChart
}: IncomeProps) => {
  setFormLoading(true);

  try {
    const payload = JSON.stringify(completeForm)
    const { data, status } = await API.post('/income/create', payload);

    if (data && status === 201) {
      setFormSuccess("Successful!");
      setFormLoading(false);
      console.log(data);

      setTimeout(async () => {
        try {
          setFormLoading(true);

          const [IncomeRes, barChartRes] = await Promise.all([
            getIncomeApi(),
            getBarChartApi(),
          ]);

          if (IncomeRes) setPresentIncome(IncomeRes?.totalIncome);
          if (barChartRes) setBarChart(barChartRes);

          setFormLoading(false);
        } catch (error) {
          setFormError("an error occurred, try again");
          setFormLoading(false);
        }
      }, 3000);
    }
  } catch (error) {
    setFormError("an error occurred, try again");
    setFormLoading(false);
  }
}

export const getIncomeApi = async () => {
  try {
    const { data, status } = await API.get(`/income/incomes/monthly/${user_id}`);

    if (data) {
      console.log(data);

      return data;
    }
  } catch (error) {
    console.log(error)
  }
}