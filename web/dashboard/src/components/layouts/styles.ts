import genStyles from '../CustomStyles';

const styles = {
  container: (mb?: boolean) => `fixed ${mb ? 'block sm:w-[45%] w-[80%] bg-white rounded-tr-lg rounded-br-lg ': 'lg:block hidden w-[25%]'} h-screen  shadow-xl pl-3`,
  logout: `flex gap-5 items-center absolute bottom-6 left-2 cursor-pointer ml-3 pl-4 py-3 rounded-lg w-[90%] bg-purpleTheme text-white font-semibold hover:opacity-90`,
  link: (url: string, ln: string) => `flex gap-5 items-center pl-4 py-3 rounded-lg m-2 my-4 hover:bg-purple-200 ${url === ln && 'bg-purpleTheme text-white hover:bg-purpleTheme'}`,

  // Layout Styles -------------
  pageContainer: `lg:w-[75%] w-full lg:ml-[25%] min-h-screen lg:mb-0 bg-[#F7F7F7]`,
  bodyContainer: 'my-10 md:mx-4 mx-2 md:pl-0 pl-2',

  // Navbar Styles -------------
  navCont: 'flex justify-between p-2 relative bg-white w-full md:pr-6 md:pl-4 pl-0 pr-2',
  center: `${genStyles.flexCenter}`,
  searchIcon: 'translate-x-6 cursor-pointer dark:text-gray-200',
  navInput: 'outline-none bg-grayTheme pl-8 px-3 py-2 rounded-md md:text-base text-sm',
  navBtn: 'md:flex items-center gap-3 rounded-md p-2 px-3 bg-grayTheme hover:opacity-80 shadow-sm hidden',
  profileCont: 'flex items-center p-1 rounded-full bg-grayTheme hover:opacity-80 gap-2 cursor-pointer',
  imgCont: 'w-[45px] h-[45px] rounded-full',
  text: 'font-semibold max-w-[150px] md:block hidden',
  imgText: `${genStyles.flexCenter} object-contain rounded-full bg-purple-200 text-center w-full h-full font-bold text-lg`,
  menu: 'block lg:hidden ml-2 text-purpleTheme',

  // UserProfile Styles --------
  userProfileCont: "nav-item absolute right-1 top-16 bg-white p-8 rounded-lg w-96 z-10",
  avatarCont: "flex gap-5 items-center mt-6 border-color border-b-1 pb-6",
  between: `${genStyles.flexBtw}`,
  textLg: "font-semibold text-lg",
  textXl: "font-semibold text-xl",
  textSm: "text-gray-500 text-sm",
  textSmB: "text-gray-500 text-sm font-semibold",
  barCont: "flex gap-5 border-b-1 border-color p-4 hover:bg-grayTheme cursor-pointer",
  profileLogout: 'rounded-md py-4 bg-purpleTheme text-center w-full text-white hover:opacity-90'
};

export default styles;