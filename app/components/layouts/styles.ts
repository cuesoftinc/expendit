import genStyles from '../CustomStyles';

const styles = {
  container: 'fixed lg:block hidden h-screen w-[25%] shadow-xl pl-3',
  logout: `${genStyles.flexCenter} absolute bottom-6 left-2 ml-5 cursor-pointer`,
  link: (url: string, ln: string) => `flex gap-5 items-center pl-4 py-3 rounded-lg m-2 my-4 hover:bg-purple-200 ${url === ln && 'bg-purpleTheme text-white hover:bg-purpleTheme'}`,

  // Layout Styles -------------
  pageContainer: `lg:w-[75%] w-full lg:ml-[25%] min-h-screen lg:mb-0 bg-[#EDEEF9]`,
  bodyContainer: 'my-10 md:mx-4 mx-2 md:pl-0 pl-2',
};

export default styles;