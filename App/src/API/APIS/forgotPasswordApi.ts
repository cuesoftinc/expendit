import { API } from '../axiosSetup';
export const postEmailApi = async (payload: string) => {
  try {
    const { data, status } = await API.post('/users/forgot-password', payload);

    if (data && status === 200) {
      return data;
    }
  } catch (error) {
    throw error;
  }
}

export const postNewPasswordApi = async (resetToken: string, payload: string) => {
  try {
    const { data, status } = await API.put(`/users/reset-password/${resetToken}`, payload);

    if (data && status === 200) {
      return data;
    }
  } catch (error) {
    throw error;
  }
}