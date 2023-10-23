"use client"

import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { RiEdit2Line, RiDeleteBin2Line } from 'react-icons/ri';

const Categories: React.FC = () => {
  const [input, setInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState('');

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
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

  const handleEdit = (index: number) => {
    // Your edit logic here
  }

  const handleDelete = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    localStorage.setItem('items', JSON.stringify(newItems));
  }

  const memoizedItems = useMemo(() => items, [items]);

  return (
    <PageLayout>
      <main className="mt-4 p-10">
        <section>
          <form>
            <input
              className="p-2 rounded-md px-16 mr-5"
              value={input}
              onChange={handleInput}
              type="text"
              placeholder="Add expense category"
            />
            <button
              className="text-center rounded-md bg-[#121212] text-white p-2 shadow-lg hover:shadow-slate-600 font-semibold"
              onClick={handleSubmit}
            >
              Add Category
            </button>
          </form>
        </section>
        <section className="mt-10">
          <ul className="grid md:grid-cols-4 gap-8">
            {memoizedItems.map((item, index) => (
              <li
                key={index}
                className="bg-white text-center rounded-md text-black my-5 py-6 shadow-lg font-semibold hover:bg-purple-600 hover:text-white"
              >
                <div className="pb-5">{item}</div>
                <div className="flex gap-4 justify-center">
                  <RiEdit2Line onClick={() => handleEdit(index)} />
                  <RiDeleteBin2Line onClick={() => handleDelete(index)} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </PageLayout>
  );
}

export default Categories;
