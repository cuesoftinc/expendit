import React from 'react';
import Sidebar from './Sidebar';

const MobileSidebar = () => {
  return (
    <div className='fixed w-full bg-black/50 min-h-screen z-30'>
      <Sidebar mobile />
    </div>
  )
}

export default MobileSidebar