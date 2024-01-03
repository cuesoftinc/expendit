import { API } from '../axiosSetup';
import { getLocalStorageItem } from '@/utils/localStorage';

const userID = getLocalStorageItem('Expendit-userID') || null;
const user_id = userID ? JSON.parse(userID) : null;
// Overview Area Chart
export const getAreaHomeChartApi = async () => {
  try {
    const { data } = await API.get(`/report/chart/category/${user_id}`);

    if (data) {
      return data;
    }
  } catch (error) {
    console.log(error)
  }
}

// Report Bar Chart
export const getBarChartApi = async () => {
  try {
    const { data } = await API.get(`/report/monthly/${user_id}`);

    if (data) {
      return data;
    }
  } catch (error) {
    console.log(error)
  }
}

// Report Bar Chart
export const getPieChartApi = async () => {
  try {
    const { data } = await API.get(`/report/chart/category/expenses/${user_id}`);

    if (data) {
      return data;
    }
  } catch (error) {
    console.log(error)
  }
}

// Report Line Chart
export const getLineChartApi = async () => {
  try {
    const { data } = await API.get(`/expense/month-expense/${user_id}`);

    if (data) {
      return data;
    }
  } catch (error) {
    console.log(error)
  }
}