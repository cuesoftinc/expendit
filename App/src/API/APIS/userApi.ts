import { API } from '../axiosSetup';

const userID = localStorage.getItem('Expendit-user') || null;
const user_id = userID ? JSON.parse(userID) : null;

export const getUserApi = async () => {
  try {
    const { data, status } = await API.get(`/users/${user_id}`);

    if(data && status === 200){
      // setFormSuccess("Successful!");
      // setFormLoading(false);

      console.log(data);
      return data;
    }
  } catch (error) {
    // setFormError("an error occurred, try again");
    // setFormLoading(false);
    console.log(error)
  }
}