import React from 'react'
import styles from '@/components/CustomStyles';

const index = () => {
  return (
    <div className="md:px-4 py-6">
      <section>
        <h1 className='font-semibold'>Personal Info</h1>
        <div className='flex justify-between border-b-2 pb-6 py-2'>
          <div>
            <p className='text-sm text-gray-400'>Update your photo and personal details here</p>
          </div>
          <div className='flex md:text-sm text-xs gap-4'>
            <button className='text-purple-400 rounded-md border-2 px-2 font-semibold'>Cancel</button>
            <button className='bg-purple-400 text-white rounded-md px-2'>Save Changes</button>
          </div>
        </div>
        <div className='md:flex justify-between border-b-2 py-8'>
          <div>
            <p className='font-semibold text-sm'>Name</p>
          </div>
          <div className='flex md:gap-10 text-sm'>
            <input className='p-2 md:pr-8 rounded-md bg-gray-200 border border-gray-400' placeholder='first name'/>
            <input className='p-2 md:pr-8 rounded-md bg-gray-200 border border-gray-400' placeholder='last name'/>
          </div>
        </div>
        <div className='flex justify-between border-b-2 py-8'>
          <div>
            <p className='font-semibold text-sm'>Email</p>
          </div>
          <div className='flex gap-10 text-sm'>
            <input className='p-2 md:pr-72 rounded-md bg-gray-200 border border-gray-400' placeholder='abdulsamad.raji@cuesoft.io'/>
          </div>
        </div>
      </section>
    </div>
  )
}

export default index
