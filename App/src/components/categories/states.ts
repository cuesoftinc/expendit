import React, { useState, useEffect, useMemo } from 'react';
import {
  createCategoryApi,
  editCategoryApi,
  deleteCategoryApi,
  getCategoryApi,
} from '@/API/APIS/categoryApi';
import { useHomeContext } from '@/context';

export const useCategoryCustomState = () => {
  const {
    setFormError,
    setFormSuccess,
    formLoading,
    setFormLoading,
    categories,
    setCategories
  } = useHomeContext();

  const [input, setInput] = useState('');
  const [editedItem, setEditedItem] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleEditInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedItem(e.target.value);
  };

  const fetchAndSetCategories = async () => {
    const fetchedCat = await getCategoryApi();
    setCategories(fetchedCat);
  };

  useEffect(() => {
    fetchAndSetCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (input.trim() !== '') {
      try {
        await createCategoryApi({
          input,
          setFormError,
          setFormLoading,
          setFormSuccess,
        });
        fetchAndSetCategories();

        setInput('');
      } catch (error) {
        console.error('Error creating category:', error);
      }
    }
  };

  const handleEdit = async () => {
    if (selectedItemIndex !== null) {
      try {
        const categoryId = categories[selectedItemIndex]?.ID;

        if (categoryId) {
          await editCategoryApi({
            input: editedItem,
            id: categoryId,
            setFormError,
            setFormLoading,
            setFormSuccess,
          });

          fetchAndSetCategories();

          setEditedItem('');
          setSelectedItemIndex(null);
        }
      } catch (error) {
        console.error('Error editing category:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedItemIndex !== null) {
      try {
        const categoryId = categories[selectedItemIndex]?.ID;

        if (categoryId) {
          await deleteCategoryApi({
            id: categoryId,
            setFormError,
            setFormLoading,
            setFormSuccess,
          });

          fetchAndSetCategories();

          setSelectedItemIndex(null);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const memoizedItems = useMemo(() => categories, [categories]);

  return {
    handleDelete,
    handleEdit,
    handleInput,
    handleEditInput,
    handleSubmit,
    memoizedItems,
    input,
    setSelectedItemIndex,
    selectedItemIndex,
    editedItem,
  };
};
