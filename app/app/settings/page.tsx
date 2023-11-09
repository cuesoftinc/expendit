"use client"

import React from 'react';
import PageLayout from "@/components/layouts/PageLayout";
import styles from '@/components/CustomStyles';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { useState } from 'react';
import ProfileSettings from '../../components/settings/ProfileSettings'

const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (index: number) => {
    setActiveTab(index)
  }

  return (
    <PageLayout>
      <main className={styles.pagePad}>
        <h1 className='text-3xl font-semibold'>Settings</h1>
        <section>
          <Tabs>
            <TabList className="md:mx-4 font-semibold flex gap-6 border-b-2">
              <Tab 
                className={`${activeTab === 0 ? 'underline underline-offset-8': ' '} cursor-pointer`}
                onClick={() => handleTabChange(0)}
              >
                Profile
              </Tab>
              <Tab 
                className={`${activeTab === 1 ? 'underline underline-offset-8': ' '} cursor-pointer`}
                onClick={() => handleTabChange(1)}
              >
                Format
              </Tab>
              <Tab 
                className={`${activeTab === 2 ? 'underline underline-offset-8': ' '}  cursor-pointer`}
                onClick={() => handleTabChange(2)}
              >
                Password
              </Tab>
            </TabList>

            <TabPanel>
              <ProfileSettings />
            </TabPanel>
            <TabPanel>
              <h1>Any content 2</h1>
            </TabPanel>
            <TabPanel>
              <h1>Any content 3</h1>
            </TabPanel>
          </Tabs>
        </section>
      </main>
    </PageLayout>
  )
}

export default Settings
