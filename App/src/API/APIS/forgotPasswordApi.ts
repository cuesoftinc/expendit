import { API } from '../axiosSetup';
import { ResetPasswordProps, ForgotPasswordProps } from '../types';

export const postEmailApi = async ({
  email,
  setFormSuccess,
  setFormError,
  setEmailSuccess,
  setFormLoading
}: ForgotPasswordProps) => {
  const payload = JSON.stringify({ email });
  console.log(payload)
  try {
    const { data, status } = await API.post('/users/forgot-password', payload);

    if (data && status === 200) {
      setFormLoading(false);
      setFormSuccess("Successful");
      setEmailSuccess(true);
    }
  } catch (error) {
    console.log(error);
    setFormError("an error occurred, try again!");
  }
}

export const postNewPasswordApi = async ({
  resetToken,
  passwordForm,
  setFormLoading,
  setFormSuccess,
  setFormError,
}: ResetPasswordProps

) => {

  try {
    console.log(resetToken)
    const payload = JSON.stringify(passwordForm);
    const { data, status } = await API.patch(
      `/users/reset-password?reset_token=${resetToken}`,
      payload
    );

    if (data && status === 200) {
      setFormLoading(false);
      setFormSuccess("successful");
    }
  } catch (error) {
    console.log(error);
    setFormLoading(false);
    setFormError("an error occurred, try again!");
  }
}