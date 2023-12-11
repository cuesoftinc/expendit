import Image from 'next/image';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import styles from './styles';
import Plan from '../../assets/images/plan.png'
import { useState } from 'react';

const Services =  () =>{
  const tabs = [
    "Plan Your Finance",
    "Create Monthly Budget",
    " Use For Business Revenue Allocation",
    "Plan Savings"
  ];

  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (index: number) => {
    setActiveTab(index)
  }
  
  return(
    <main className={styles.sectionContainer}>
      <Tabs>
        <TabList className={styles.tabList}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              className={`${activeTab === index 
                ? `${styles.bgBlack}` 
                : `${styles.bgGray}`} 
                cursor-pointer rounded-sm`
              }
              onClick={() => handleTabChange(index)}
            ><p className={styles.fluid_text}>{tab}</p></Tab>
          ))}
        </TabList>

        <TabPanel>
          <Image src={Plan} alt="" className='mx-auto'/>
        </TabPanel>
        <TabPanel>
          <Image src={Plan} alt="" className='mx-auto'/>
        </TabPanel>
        <TabPanel>
          <Image src={Plan} alt="" className='mx-auto'/>
        </TabPanel>
        <TabPanel>
          <Image src={Plan} alt="" className='mx-auto'/>
        </TabPanel>
      </Tabs>
    </main>
  )
};

export default Services