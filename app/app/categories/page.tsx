"use client"

import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layouts/PageLayout';

const Categories: React.FC = () => {
  const [input, setInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [editedItem, setEditedItem] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const handleEditInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedItem(e.target.value);
  }

  useEffect(() => {
    const categories = JSON.parse(localStorage.getItem('items') || '[]');
    setItems(categories);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.trim() !== '') {
      const newItems = [...items, input];
      setItems(newItems);
      localStorage.setItem('items', JSON.stringify(newItems));
      setInput('');
    }
  }

  const handleEdit = () => {
    if (selectedItemIndex !== null) {
      const editedItems = [...items];
      editedItems[selectedItemIndex] = editedItem;
      setItems(editedItems);
      localStorage.setItem('items', JSON.stringify(editedItems));
      setEditedItem('');
      setSelectedItemIndex(null);
    }
  }

  const handleDelete = () => {
    if (selectedItemIndex !== null) {
      const newItems = [...items];
      newItems.splice(selectedItemIndex, 1);
      setItems(newItems);
      localStorage.setItem('items', JSON.stringify(newItems));
      setSelectedItemIndex(null);
    }
  }

  const memoizedItems = useMemo(() => items, [items]);

  return (
    <PageLayout>
      <main className="mt-4 p-10">
        <h1 className="text-3xl font-bold mb-6 flex justify-center">Categories</h1>
        <div className='grid md:grid-cols-2 gap-4'>
          <section className='border-[1px] bg-white shadow-lg py-10 px-5 flex-1 min-h-[300px] rounded-md'>
            <div className='border-b-2 pb-2'>
              <h2 className='flex justify-center font-semibold text-xl'>Delete Category</h2>
              <select
                className='rounded-lg my-12 px-2 py-2 bg-[#EDEEF9] shadow-inner w-full'
                onChange={(e) => setSelectedItemIndex(parseInt(e.target.value, 10))}
                value={selectedItemIndex !== null ? selectedItemIndex.toString() : ""}
              >
                <option value="">Choose a category</option>
                {memoizedItems.map((item, index) => (
                  <option key={index} value={index.toString()}>
                    {item}
                  </option>
                ))}
              </select>
              <div className='text-center rounded-md bg-[#121212] text-white my-5 py-2 shadow-lg hover:shadow-slate-600 font-semibold max-w-xs mx-auto'>
                <button onClick={handleDelete}>Delete</button>
              </div>
            </div>
            <div>
              <h2 className='flex justify-center font-semibold text-xl mt-10'>Edit Category</h2>
              <input
                onChange={handleEditInput}
                type="text"
                className='rounded-lg my-10 px-2 py-2 bg-[#EDEEF9] shadow-inner w-full'
                placeholder='Rename category'
                value={editedItem}
              />
              <div className='text-center rounded-md bg-[#121212] text-white my-5 py-2 shadow-lg hover:shadow-slate-600 font-semibold max-w-xs mx-auto'>
                <button onClick={handleEdit}>Edit</button>
              </div>
            </div>
          </section>
          <section className='border-[1px] bg-white shadow-lg py-10 px-5 flex-1 max-h-[300px] rounded-md'>
            <h2 className='flex justify-center font-semibold text-xl'>Create a new category</h2>
            <input value={input} onChange={handleInput} type="text" className='rounded-lg my-12 px-2 py-2 bg-[#EDEEF9] shadow-inner w-full' placeholder='Add new category'/>
            <div onClick={handleSubmit} className='text-center rounded-md bg-[#121212] text-white my-5 py-2 shadow-lg hover:shadow-slate-600 font-semibold max-w-xs mx-auto'>
              <button>Upload</button>
            </div>
          </section>
        </div>
      </main>
    </PageLayout>
  );
}

export default Categories;
