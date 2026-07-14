import { API } from "../axios-setup";
import { ExpenseProps } from "../types";
import { getLocalStorageItem } from "@/utils/local-storage";
import { getBarChartApi, getLineChartApi, getPieChartApi } from "./report-api";

const getUserId = () => {
  const raw = getLocalStorageItem("Expendit-userID");
  return raw ? JSON.parse(raw) : null;
};

export const expenseCreateApi = async ({
  completeForm,
  setFormError,
  setFormSuccess,
  setFormLoading,
  setExpenseData,
  setTotalExpense,
  setBarChart,
  setPieChart,
  setLineChart,
}: ExpenseProps) => {
  try {
    const payload = JSON.stringify(completeForm);

    const { data, status } = await API.post("/expense/create", payload);

    if (data && status === 201) {
      setFormSuccess("Successful!");
      setFormLoading(false);

      try {
        setFormLoading(true);

        // RE-FETCH ALL FINANCIAL AND REPORT DATA AGAIN
        const [
          expenseRes,
          monthlyExpenseRes,
          barChartRes,
          pieChartRes,
          lineChartRes,
        ] = await Promise.all([
          getExpenseApi(),
          getMonthlyExpenseApi(),
          getBarChartApi(),
          getPieChartApi(),
          getLineChartApi(),
        ]);

        if (monthlyExpenseRes) setTotalExpense(monthlyExpenseRes.totalExpense);
        if (expenseRes) setExpenseData(expenseRes.results);
        if (barChartRes) setBarChart(barChartRes);
        if (pieChartRes) setPieChart(pieChartRes);
        if (lineChartRes) setLineChart(lineChartRes);

        setFormLoading(false);
        window.location.reload();
      } catch (error) {
        setFormError("An error occurred, try again");
        setFormLoading(false);
      }
    }
  } catch (error) {
    setFormError("An error occurred, try again");
    setFormLoading(false);
  }
};

export const getExpenseApi = async () => {
  try {
    const { data } = await API.get(
      `/expense/user/${getUserId()}?page=1&per_page=10`,
    );

    if (data) {
      return data;
    }
  } catch (error) {
  }
};

export const getMonthlyExpenseApi = async () => {
  try {
    const { data } = await API.get(`/expense/expenses/month/${getUserId()}`);

    if (data) {
      return data;
    }
  } catch (error) {
  }
};

export const deleteExpenseApi = async () => {};

export const editExpenseApi = async () => {};
