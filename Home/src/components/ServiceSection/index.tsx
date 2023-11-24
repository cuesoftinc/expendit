import Image from 'next/image';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import styles from './styles';
import Plan from '../../assets/images/plan.png'
import { useState } from 'react';

const Services =  () =>{
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (index: number) => {
    setActiveTab(index)
  }
  
  return(
    <main className={styles.sectionContainer}>
      <Tabs>
        <TabList className="bg-gray-300 p-4 rounded-md font-semibold mb-6 flex justify-around">
          <Tab 
            className={`${activeTab === 0 ? 'bg-black text-white p-2': 'bg-gray-300 text-black p-2'} cursor-pointer rounded-md`}
            onClick={() => handleTabChange(0)}
          >
            Plan Your Finance
          </Tab>
          <Tab 
            className={`${activeTab === 1 ? 'bg-black text-white p-2': 'bg-gray-300 text-black p-2'} cursor-pointer rounded-md`}
            onClick={() => handleTabChange(1)}
          >
            Create Monthly Budget
          </Tab>
          <Tab 
            className={`${activeTab === 2 ? 'bg-black text-white p-2': 'bg-gray-300 text-black p-2'}  cursor-pointer rounded-md`}
            onClick={() => handleTabChange(2)}
          >
            Use For Business Revenue Allocation
          </Tab>
          <Tab
            className={`${activeTab === 3 ? 'bg-black text-white p-2': 'bg-gray-300 text-black p-2'} cursor-pointer rounded-md`}
            onClick={() => handleTabChange(3)}
          >
            Plan Savings
          </Tab>
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