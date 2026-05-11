
import React, { Dispatch, SetStateAction} from 'react';
import Image from 'next/image';
import Logo from '@/assets/images/logo.png'
import { AiOutlineClose } from 'react-icons/ai';

const EmailModal = ({setEmailSuccess}: {setEmailSuccess: Dispatch<SetStateAction<boolean>>}) => {
  return (
    <div className='bg-white/90 absolute top-0 left-0 z-50 w-full h-screen backdrop-blur-sm flex justify-center items-center'>
      <div className='relative bg-white sm:min-w-[500px] min-h-[300px] min-w-[250px] rounded-md shadow-lg p-4 '>
        <span 
          className='absolute right-4 top-4 cursor-pointer hover:opacity-80'
          onClick={() => setEmailSuccess(false)}
        >
          <AiOutlineClose fontSize={20} />
        </span>
        <div className='flex flex-col items-center min-h-[280px] pt-[30px]'>
          <Image src={Logo} alt="logo" className='w-[150px] mb-8' width={150} height={50}  />
          <h1 className='text-3xl font-black mb-7'>Check Your Email!</h1>
          <p className='text-center'>
            Click on the link sent to your <br /> email
            to Reset your password 
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailModal