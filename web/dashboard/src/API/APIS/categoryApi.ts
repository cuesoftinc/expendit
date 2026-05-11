import { API } from '../axiosSetup';
import { CategoryProps } from '../types';
import { getAreaHomeChartApi, getPieChartApi } from './reportApi';

export const createCategoryApi = async ({
  input,
  setFormError,
  setFormLoading,
  setFormSuccess,
  setAreaChart,
  setPieChart
}: CategoryProps) => {
  try {
    const payload = JSON.stringify({ name: input });
    const { data, status } = await API.post('/category/create', payload);

    if (data && status === 201) {
      setFormSuccess("Category Successfully added!");
      setFormLoading(false);

      try {
        setFormLoading(true);
        const [areaChartRes, pieChartRes] = await Promise.all([
          getAreaHomeChartApi(),
          getPieChartApi(),
        ])

        if (areaChartRes) setAreaChart(areaChartRes);
        if (pieChartRes) setPieChart(pieChartRes);
      } catch (err) {
        setFormError("an error occurred, try again");
        setFormLoading(false);
      }
    }
  } catch (error) {
    setFormError("An error occurred, try again");
    setFormLoading(false);
  }
};

export const getCategoryApi = async () => {
  try {
    const { data } = await API.get('/category');
    console.log(data)
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

export const deleteCategoryApi = async ({
  id,
  setFormError,
  setFormLoading,
  setFormSuccess,
  setAreaChart,
  setPieChart
}: CategoryProps) => {
  try {
    const { data, status } = await API.delete(`/category/${id}`);

    if (status === 204) {
      setFormSuccess('Category has been deleted!');
      setFormLoading(false);
    } else {
      setFormError('Failed to delete category');
      setFormLoading(false);
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    setFormError('Failed to delete category');
    setFormLoading(false);
  }
};

export const editCategoryApi = async ({
  input,
  id,
  setFormError,
  setFormLoading,
  setFormSuccess,
  setAreaChart,
  setPieChart
}: CategoryProps) => {
  try {
    const payload = JSON.stringify({ name: input });
    const { data, status } = await API.put(`/category/${id}`, payload);

    if (data && status === 200) {
      setFormSuccess('Category has been edited!');
      setFormLoading(false);
    } else {
      setFormError('Failed to edit category');
      setFormLoading(false);
    }
  } catch (error) {
    console.error('Error editing category:', error);
    setFormError('Failed to edit category');
    setFormLoading(false);
  }
};