"use client"

import React, { useEffect } from 'react';
import { TbCurrencyNaira } from 'react-icons/tb';
// import { useCustomState } from '@/hooks/responsive';
import { summaryData } from '@/dummy';
import { getIncomeApi } from '@/API/APIS/incomeApi';
import Slider from  "react-slick";
import styles from './styles';

interface boardProps{
  icon: any;
  title: string;
  amount: string;
  percentage: string;
  chart: any;
};

const Board = ({icon, title, amount, percentage, chart}: boardProps) => {
  // const [ mobile ] = useCustomState();

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
  useEffect(() => {
    async function getIncome(){
      await getIncomeApi();
    }

    getIncome();
  }, [])

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
        {summaryData.map((item, index) => (
          <Board key={index} {...item} />
        ))}
      </Slider>
    </div>
  ))
}

export default TopBoard