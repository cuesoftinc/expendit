import { Dispatch, SetStateAction } from 'react';
import { API } from '../axiosSetup';
import { getLocalStorageItem } from '@/utils/localStorage';

const userID = getLocalStorageItem('Expendit-user') || null;
const user_id = userID ? JSON.parse(userID) : null;

export const getUserApi = async (setFormLoading: Dispatch<SetStateAction<boolean>>) => {
  setFormLoading(true)
  try {
    const { data, status } = await API.get(`/users/${user_id}`);

    if (data && status === 200) {
      // setFormSuccess("Successful!");
      setFormLoading(false);

      console.log(data);
      return data;
    }
  } catch (error) {
    // setFormError("an error occurred, try again");
    setFormLoading(false);
    console.log(error)
  }
}