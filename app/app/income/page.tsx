"use client"

import PageLayout from '@/components/layouts/PageLayout'
import styles from './styles'
import React, { useState, useEffect, useMemo } from 'react';

const Income = () => {
  const [items, setItems] = useState<string[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const categories = JSON.parse(localStorage.getItem('items') || '[]');
    setItems(categories);
  }, []);

  const memoizedItems = useMemo(() => items, [items]);
  return (
    <PageLayout>
      <div>
        <h1 className='mt-8 flex justify-center font-bold text-2xl'>Add a Budget</h1>
        <form className={styles.form}>
          <div className={styles.inputContainer}>
            <label htmlFor='name'>Amount </label>
            <input className={styles.input} type="text"/>
          </div>
          <div className={styles.inputContainer}>
            <label htmlFor='email'>Date </label>
            <input className={styles.input} type="date"/>
          </div>
          <div className={styles.inputContainer}>
            <label htmlFor='subject'>Category </label>
            <select
              className={styles.input}
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
          </div>
          <div className={styles.inputContainer}>
            <label>Note </label>
            <textarea className={styles.input}/>
          </div>
          <div className={styles.btn}>
            <input className={styles.submit} type="submit" value="Submit"/>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}

export default Income