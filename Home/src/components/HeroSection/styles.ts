import genStyles from '../CustomStyles';

const styles = {
  heroContainer: `${genStyles.pagePad} min-h-screen relative hero-bg`,
  navContainer: `${genStyles.flexBtw} py-4`,
  navLinksContainer: 'flex gap-[3.5rem] text-xl font-semibold',
  btnOne: `${genStyles.btn} px-[4rem] py-3 hover:bg-purple-500 btn-gradient text-white`,
  btnTwo: `${genStyles.btn} py-4 hover:bg-purple-500 btn-gradient text-white`,
  btnThree: `${genStyles.btn} bg-white py-4 border-2 border-[#B778E9] text-[#B778E9] hover:bg-[#B778E9] hover:text-white`,
  heroSection: 'md:mt-[5%] mt-[12%] flex lg:flex-row flex-col gap-10',
  header: `${genStyles.header}`,
  subtext: `${genStyles.subtext} mb-6 sm:w-[80%] w-[93%]`,
  imgContainer: `${genStyles.flexCenter} lg:w-[45%] lg:h-auto h-[300px] w-full lg:absolute relative lg:top-[5%] lg:mt-0 md:mt-[10%] mt-0 top-8 right-0 -z-10`,
  img: 'object-contain w-[80%] ',

  // Mobile Navbar Styles 
  mobileNavCont: 'w-[98%] min-h-[500px] absolute top-0 left-[1%] glassmorphism text-white p-4',
  closeNavCont: 'w-full flex justify-end py-6 px-4',
  mobileNavlinks: 'flex flex-col gap-6 min-h-[300px]',
}

export default styles;