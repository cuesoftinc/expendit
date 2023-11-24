import genStyles from '../CustomStyles';

const styles = {
  imgContainer: 'w-[45%] bg-[#F3E8FF] md:flex hidden items-center justify-center ',

  // Form Styles ----------
  formCont : `${genStyles.flexCenter} flex-col  py-[3%] md:px-[15%] px-[5%]`,
  subHead: 'font-bold md:text-2xl text-xl text-center my-4',
  hr: 'w-[46%] h-[2px]',
  check: 'w-full flex items-start',
  links: 'text-purple-600 underline cursor-pointer hover:text-black',
  links2: 'underline mt-4 text-sm cursor-pointer hover:text-primaryBtn',
  checkbox: 'mr-4 mt-2 cursor-pointer',
  btn: 'rounded-md py-4 text-center bg-secondary hover:opacity-90 text-white w-full',

  // Input Styles --------------
  label: 'my-3 block font-bold tracking-widest md:text-base text-sm',
  input: (cst?: boolean) => `outline-none px-4 py-4 w-full ${cst && 'shadow-sm border-black/80 border-[1px]'} bg-grayTheme rounded-lg focus:border-2 md:text-base text-sm`,
};

export default styles;