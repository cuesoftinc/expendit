"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BsBoxSeam } from 'react-icons/bs';
import { FiBarChart, } from 'react-icons/fi';
import { HiOutlineRefresh } from 'react-icons/hi';
import { MdShowChart } from "react-icons/md";
import { TbCurrencyNaira } from 'react-icons/tb';
import { formatNumberWithCommas as formatValue } from '@/utils/formatWithCommas';
import Slider from  "react-slick";
import styles from './styles';
import { useHomeContext } from '@/context';


interface boardProps{
  icon: any;
  title: string;
  amount: string;
  percentage: string;
  chart: any;
};

const Board = ({icon, title, amount, percentage, chart}: boardProps) => {

  return (
    <div className={styles.boardCont}>
      <div className={styles.leftCont}>
        <button type='button' className={styles.btn}>
        <span className={styles.span}>{icon}</span></button>
        <p className={styles.textSm}>Compared to last month</p>
      </div>
      <div className={styles.rightCont}>
        <p className={styles.title}>{title}</p>
        <p className={styles.amount}><TbCurrencyNaira fontSize={30} />  {amount}</p>
        <div className={styles.chartCont}>
          <span className='mr-2'>{chart}</span>
          <p className={styles.percent}>{percentage}</p>
        </div>
      </div>
    </div>
  )
};


const TopBoard = () => {
  const router = useRouter();
  const { 
    presentIncome, 
    totalExpense, 
    totalBalance, 
    setTotalBalance 
  } = useHomeContext();

  useEffect(() => {
    setTotalBalance(
      presentIncome - totalExpense
    )
  }, [totalExpense, presentIncome])

  var settings = {
    dots: false,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 3,
    arrows: false,
    initialSlide: 0,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          dots: true
        }
      }
    ]
  }
    
  return ((
    <div className="">
      <Slider {...settings}>
        <Board 
          icon={<HiOutlineRefresh />}
          title='Total Income'
          amount={formatValue(presentIncome) || 0}
          percentage='-12%'
          chart={<MdShowChart  color='red'/>}
        />
        <Board 
          icon={<FiBarChart />}
          title='Total Expenses'
          amount={formatValue(totalExpense) || 0}
          percentage='+38%'
          chart={<MdShowChart  color='green'/>}
        />
        <Board 
          icon={<BsBoxSeam />}
          title='Balance'
          amount={formatValue(totalBalance) || 0}
          percentage='+23%'
          chart={<MdShowChart  color='green'/>}
        />
      </Slider>
    </div>
  ))
}

export default TopBoard