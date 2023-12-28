import { API } from '../axiosSetup';
import { getLocalStorageItem } from '@/utils/localStorage';

const userID = getLocalStorageItem('Expendit-userID') || null;
const user_id = userID ? JSON.parse(userID) : null;

export const getReportApi = async () => {
  try {
    const { data } = await API.get(`/report/monthly/${user_id}`);

    if (data) {
      console.log(data);

      return data;
    }
  } catch (error) {
    console.log(error)
  }
}