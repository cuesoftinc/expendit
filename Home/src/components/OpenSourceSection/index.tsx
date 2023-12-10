"use client"
import React from 'react';
import Image from 'next/image';
import styles from './styles';
import OpenSourceBanner from '../../assets/images/open_source_banner.png';
import ArrowRight from '../../assets/icons/arrow_right.svg';
import Github from '../../assets/icons/github.svg';
import Discord from '../../assets/icons/discord.svg';
import Phone from '../../assets/images/phone.png';

const Index = () => {
  return (
    <div className={styles.sectionContainer} id='about'>
      <h1 className={styles.header}>
        Open-source, transparent and 
        <br /> <span className='text-purpleTheme'>Community-driven</span>
      </h1>
      <div className={styles.section_wrapper}>
        <span>
          <Image src={OpenSourceBanner} alt='A banner' />
        </span>
        <div className={styles.box_wrapper}>
          <div className={styles.card}>
            <h3 className={styles.box_header}>
              Our thriving developer <br /> community
            </h3>
            <p className={styles.box_text}>
              best-in-class support, and partner ecosystem ensure you get all the help you need
            </p>
            <div className={styles.gap_10}>
              <div className={styles.gap_6}>
                <span className={`${styles.icon_bg} ${styles.github}`}>
                  <Image src={Github} alt="Github icon" />
                </span>
                <span className={`${styles.icon_bg} ${styles.discord}`}>
                  <Image src={Discord} alt="Discord icon" />
                </span>
              </div> 
              <button type='button' className={styles.btn_one}>
                community 
                <Image src={ArrowRight} alt="arrow right icon" />
              </button>
            </div>
          </div>
          <div className={styles.card}>
            <div className='flex gap-2 w-full items-center'>
              <div className='w-[70%] flex flex-col gap-4'>
                <h3 className={styles.box_header}>Growing partner <br /> ecosystem</h3>
                <p className={styles.box_text}>To help build better apps faster</p>

                <div className={styles.partner}>
                  <p className={styles.sub_text}>Expendit partner program</p>
                  <Image src={ArrowRight} alt="arrow right icon" className='invert' />
                </div>
              </div>
              <span className="w-[30%] h-full">
                <Image src={Phone} alt="mobile phones" className='object-cover' />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Index