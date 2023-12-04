"use client"
import React, { useState, MouseEvent } from 'react';
import { MdFilterList } from 'react-icons/md';
import { expenseRow, categories } from '@/dummy';
import { Expense } from '../home/LatestExpenses';
import Pagination from './Pagination';
import styles from './styles';

const Index = () => {
  const [ panel, setPanel ] = useState<boolean>(false);
  const newCategories = [  "All", ...categories];
  const [ filteredHistory, setFilteredHistory ] = useState(expenseRow);
  const handleSelection = (e: MouseEvent<HTMLParagraphElement>, category: string) => {
    setPanel(false);
    const filtered = expenseRow.filter((el) => el.category === category)

    if(category === "All"){
      setFilteredHistory(expenseRow);
    } else {
      setFilteredHistory(filtered);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.headerText}>Expense History</p>
        <div className='relative'>
          <button className={styles.filterBtn} 
            onClick={() => setPanel(!panel)}>
            <MdFilterList fontSize={20} />
            <p className='md:text-base text-sm'>Filter</p>
          </button>
          {panel && <div className={styles.panel}>
            {newCategories.map((category) => (
              <p 
                key={category} 
                className={styles.category} 
                onClick={(e) => handleSelection(e, category)}>
                {category}
              </p>
            ))}
          </div>}
        </div>
      </div>
      <div className={styles.transactionsContainer}>
        <div className={styles.transactionsHeader}>
          <p className="flex-1">Category</p>
          <p className="flex-1">Amount</p>
          <p className="flex-1">Note</p>
          <p className="flex-1 md:text-center text-left">Date</p>
        </div>
        {filteredHistory?.map((data, index) => (
            <Expense key={index} {...data} history={true} />
          ))}
      </div>
      <Pagination />
    </div>
  )
}

export default Index