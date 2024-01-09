"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useHomeContext } from '@/context';
import { postEmailApi, postNewPasswordApi } from '@/API/APIS/forgotPasswordApi';
import { PasswordResetProps, forgotPasswordProps } from './types';
import { useRouter } from 'next/router';


export const useForgotPasswordCustomState = () => {

  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading,
  } = useHomeContext();

  const router = useRouter();


  const initialEmailForm: forgotPasswordProps = {
    email: "",
  };

  const initialPasswordForm: PasswordResetProps = {
    newpassword: "",
    confirmpassword: ""
  };

  const [form, setForm] = useState<forgotPasswordProps>(initialEmailForm);
  const [passwordForm, setPasswordForm] = useState<PasswordResetProps>(initialPasswordForm);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }))
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  };

  const handleEmailSubmit = async () => {
    try {
      const payload = JSON.stringify({ email: form.email });
      await postEmailApi(payload);
      setFormSuccess("Successful")
    } catch (error) {
      console.log(error)
      setFormError("An error occured, try again")
    }
  }

  const handlePasswordSubmit = async () => {
    try {
      const resetToken = router.query.token as string;
      const payload = JSON.stringify({passwordForm});

      await postNewPasswordApi(resetToken, payload);
      
      // router.push('/forgotpassword/success');
    } catch (error) {
      console.log(error)
    }
  };


  return {
    form,
    passwordForm,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handlePasswordChange,
    handleEmailSubmit,
    handlePasswordSubmit,
  }
}