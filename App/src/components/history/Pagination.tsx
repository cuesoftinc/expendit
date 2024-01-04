import React, { useEffect, useState } from 'react';
import { useHomeContext } from '@/context';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { generatePagination } from '@/utils/generatePagination';
import styles from './styles';

const Pagination = () => {
  const { setCurrentPage, currentPage, totalPage } = useHomeContext();
  const [ totalPages, setTotalPages ] = useState(totalPage)
  const total_pages = Array(totalPages).fill(null);
  const totalLength = total_pages.length;

  useEffect(() => {
    setTotalPages(totalPage);
  }, [totalPage])

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

  const pagination = generatePagination(currentPage, totalPages);

  console.log(pagination.join(', '));

  return (
    <div className={styles.pagination}>
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