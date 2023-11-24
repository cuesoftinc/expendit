import genStyles from '../CustomStyles';

const styles = {
  heroContainer: `${genStyles.pagePad} min-h-screen `,
  navContainer: `${genStyles.flexBtw} py-4`,
  navLinksContainer: 'flex gap-[3.5rem] text-xl font-semibold',
  btnOne: `${genStyles.btn} px-8 py-3`,
  btnTwo: `${genStyles.btn} px-14 py-4`,
  heroSection: 'md:mt-[8%] mt-[15%] flex md:flex-row flex-col gap-10',
  header: `${genStyles.header}`,
  subtext: `${genStyles.subtext} mb-6 sm:w-[80%] w-[93%] md:text-base text-sm`,
  imgContainer: `${genStyles.flexCenter} md:w-[45%] w-full`,
  img: 'object-contain w-[60%] md:-translate-y-[3.5rem] -translate-y-0',

  // Mobile Navbar Styles 
  mobileNavCont: 'w-[98%] min-h-[500px] absolute top-0 left-[1%] glassmorphism text-white p-4',
  closeNavCont: 'w-full flex justify-end py-6 px-4',
  mobileNavlinks: 'flex flex-col gap-6 min-h-[300px]',
}

export default styles;