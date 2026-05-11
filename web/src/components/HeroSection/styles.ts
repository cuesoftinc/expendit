import genStyles from '../CustomStyles';

const styles = {
  heroContainer: `min-h-screen relative hero-bg`,
  navContainer: `${genStyles.flexBtw} py-4 fixed w-full bg-white px-[4%] top-0 z-40`,
  navLinksContainer: 'flex gap-[3.5rem] text-lg font-semibold',
  btnOne: `${genStyles.btn} px-[4rem] py-3 hover:bg-purple-500 btn-gradient text-white`,
  btnTwo: `${genStyles.btn} py-4 hover:bg-purple-500 btn-gradient text-white`,
  btnThree: `${genStyles.btn} bg-white py-4 border-2 border-[#B778E9] text-[#B778E9] hover:bg-[#B778E9] hover:text-white`,
  heroSection: `px-[4%] py-[2%] text-[#414141] md:mt-[5%] sm:mt-[12%] mt-[16%] flex lg:flex-row flex-col gap-10`,
  header: `${genStyles.header} `,
  subtext: `${genStyles.subtext} mb-6 sm:w-[80%] w-[93%]`,
  imgContainer: `${genStyles.flexCenter} lg:w-[45%] lg:h-auto h-[300px] w-full lg:absolute relative lg:-top-[12%] lg:mt-0 md:mt-[10%] md:mb-0 mb-[30px] top-8 md:right-0 right-[15%] -z-10`,
  img: 'object-contain w-[80%] ',

  // Mobile Navbar Styles 
  mobileNavCont: 'w-[98%] min-h-[500px] fixed top-0 left-[1%] glassmorphism text-white p-4 z-40',
  closeNavCont: 'w-full flex justify-end py-6 px-4',
  mobileNavlinks: 'flex flex-col gap-6 min-h-[300px]',
}

export default styles;