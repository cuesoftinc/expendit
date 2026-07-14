import { API } from "../axios-setup";
import { getLocalStorageItem } from "@/utils/local-storage";

const getUserId = () => {
  const raw = getLocalStorageItem("Expendit-userID");
  return raw ? JSON.parse(raw) : null;
};

// Overview Area Chart
export const getAreaHomeChartApi = async () => {
  try {
    const { data } = await API.get(`/report/chart/category/${getUserId()}`);
    if (data) return data;
  } catch (error) {
    console.log(error);
  }
};

// Report Bar Chart
export const getBarChartApi = async () => {
  try {
    const { data } = await API.get(`/report/monthly/${getUserId()}`);
    if (data) return data;
  } catch (error) {
    console.log(error);
  }
};

// Pie Chart — expenses by category
export const getPieChartApi = async () => {
  try {
    const { data } = await API.get(`/report/chart/category/expenses/${getUserId()}`);
    if (data) return data;
  } catch (error) {
    console.log(error);
  }
};

// Report Line Chart
export const getLineChartApi = async () => {
  try {
    const { data } = await API.get(`/expense/month-expense/${getUserId()}`);
    if (data) return data;
  } catch (error) {
    console.log(error);
  }
};
