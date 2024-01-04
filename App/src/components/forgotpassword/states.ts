"use client"

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useHomeContext } from '@/context';
import { postEmailApi, postNewPasswordApi, postTokenApi } from '@/API/APIS/forgotPasswordApi';
import { forgotPasswordProps, tokenProps } from './types';


export const useForgotPasswordCustomState = () => {

  const {
    formError,
    setFormError,
    formSuccess,
    setFormSuccess,
    formLoading,
    setFormLoading,
    currentStep,
    setCurrentStep,
  } = useHomeContext();


  const initialEmailForm: forgotPasswordProps = {
    email: "",
  };

  const initialTokenForm: tokenProps = {
    token: "",
  };

  const [form, setForm] = useState<forgotPasswordProps>(initialEmailForm);
  const [tokenForm, setTokenForm] = useState<tokenProps>(initialTokenForm)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }))
  };

  const handleNext = async (setCurrentStep: React.Dispatch<React.SetStateAction<number>>) => {
    switch (currentStep) {
      case 1:


        if (formLoading) return;
        setFormLoading(true);

        let reg = /^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/;
        const isValidEmail = reg.test(form.email);

        if (!isValidEmail) {
          setFormError("Invalid Email!");
          setFormLoading(false);
          return;
        };

        setForm(initialEmailForm);

        try {
          await postEmailApi();
          setCurrentStep((prevStep) => prevStep + 1);
        } catch (error) {
          console.error('Error in step 1 API request', error);
        }
        break;
      case 2:
        try{
          postTokenApi();
          setCurrentStep((prevStep) => prevStep + 1);
        } catch(error) {
          console.error('Error in step 2 API request', error);
        }
        
        break;
      case 3:
        try {
          postNewPasswordApi();
        } catch(error) {
          console.error('Error in step 3 API request', error);
        }
        
        break;
    
      default:
        break;
    }
  }

  return {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleNext,
    currentStep,
    setCurrentStep,
    tokenForm
  }
}