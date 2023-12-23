"use client"
import React, { useState, MouseEvent } from 'react';
import { MdFilterList } from 'react-icons/md';
import { Expense } from '../home/LatestExpenses';
import Pagination from './Pagination';
import styles from './styles';
import { useHomeContext } from '@/context';

const Index = () => {
  const { categories, expenseData } = useHomeContext();
  const [ panel, setPanel ] = useState<boolean>(false);
  const newCategories = [  {name: "All"}, ...categories];
  const [ filteredHistory, setFilteredHistory ] = useState(expenseData);

  const handleSelection = (e: MouseEvent<HTMLParagraphElement>, category: string) => {
    setPanel(false);
    const filtered = expenseData.filter((el: any) => el.category.toLowerCase() === category.toLowerCase());

    if(category === "All"){
      setFilteredHistory(expenseData);
    } else {
      setFilteredHistory(filtered);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner_cont}>
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
                  key={category.name} 
                  className={styles.category} 
                  onClick={(e) => handleSelection(e, category.name)}>
                  {category.name}
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
          {filteredHistory 
            && filteredHistory.slice().reverse().map((data: any, index: number) => (
              <Expense key={index} {...data} history={true} />
            ))}
        </div>
      </div>
      <Pagination />
    </div>
  )
}

export default Index