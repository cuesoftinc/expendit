import styles from './styles';
import {FaLocationDot} from 'react-icons/fa6'
import {IoMdContact} from 'react-icons/io'
import {BsClockFill} from 'react-icons/bs'

const Contact = () => {
  return (
    <main className="">
      <div className= {styles.sectionContainer}>
        <div className={styles.innerContainer}>
          <div className='grid grid-cols-1 sm:grid-cols-2 m-auto p-8'>
            <div className='md:ps-14'>
              <h1 className={styles.header}>Get a personal consultation</h1>
              <ul>
                <li className='mb-16'>
                  <div className='flex gap-4'>
                    <FaLocationDot className='text-purple-500 text-2xl' />
                    <p>Office</p>
                  </div>
                  <p className='md:w-96 mt-4'>39 Alfred Rewane Road, Mulliner Towers, Ikoyi, 101233, Lagos, Nigeria</p>
                </li>
                <li className='mb-16'>
                  <div className='flex gap-4'>
                    <IoMdContact className='text-purple-500 text-2xl' />
                    <p>Office</p>
                  </div>
                  <p className='w-96 mt-4'>info@expendit.com</p>
                </li>
                <li className='mb-16'>
                  <div className='flex gap-4'>
                    <BsClockFill className='text-purple-500 text-2xl' />
                    <p>Open hours</p>
                  </div>
                  <p className='w-96 mt-4'>Monday - Friday:<br/> 9am - 5pm</p>
                </li>
              </ul>
            </div>
            <div>
              <form className='bg-purple-200 p-8 md:mx-12 rounded-lg'>
                <div className='flex flex-col text-slate-800 py-2'>
                  <label htmlFor='name'>Name </label>
                  <input className='rounded-lg mt-2 p-2 focus:border-slate-300 focus:bg-slate-100' type="text"/>
                </div>
                <div className='flex flex-col text-slate-800 py-2'>
                  <label htmlFor='email'>Email </label>
                  <input className='rounded-lg mt-2 p-2 focus:border-slate-300 focus:bg-slate-100' type="email"/>
                </div>
                <div className='flex flex-col text-slate-800 py-2'>
                  <label htmlFor='subject'>Subject </label>
                  <input className='rounded-lg mt-2 p-2 focus:border-slate-300 focus:bg-slate-100' type="text"/>
                </div>
                <div className='flex flex-col text-slate-800 py-2'>
                  <label>How can we help? </label>
                  <textarea className='rounded-lg mt-2 p-2 focus:border-slate-300 focus:bg-slate-100'/>
                </div>
                <div className={styles.btn}>
                  <input className='cursor-pointer w-full mx-auto' type="submit" value="Submit"/>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Contact
