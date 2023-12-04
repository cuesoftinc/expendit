import React, { useState } from 'react';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { generatePagination } from '@/utils/generatePagination';
import styles from './styles';

const Pagination = () => {
  const [ currentPage, setCurrentPage ] = useState<number>(1);
  const total_pages = Array(10).fill(null);
  const totalLength = total_pages.length;

  const handleForward = (e: any) => {
    console.log(currentPage)
    if(currentPage === totalLength) return;
    setCurrentPage(currentPage + 1)
  };
  const handleBackward = (e: any) => {
    console.log(currentPage)
    if(currentPage === 1) return;
    setCurrentPage(currentPage - 1)
  };

  const totalPages = 10;
  const pagination = generatePagination(currentPage, totalPages);

  console.log(pagination.join(', '));

  return (
    <div className='w-full flex justify-end'>
      <div className='flex gap-3'>
        <span onClick={handleBackward} className={styles.arrow(currentPage, totalLength, "back")}>
          <IoIosArrowBack fontSize={20} />
        </span>
        {total_pages.map((value,index) => (
          <span key={index} onClick={() => setCurrentPage(index + 1)}>{index + 1}</span>
        ))}
        <span onClick={handleForward} className={styles.arrow(currentPage, totalLength, "forth")}>
          <IoIosArrowForward fontSize={20} />
        </span>
      </div>
    </div>
  )
}

export default Pagination