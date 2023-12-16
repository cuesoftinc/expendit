import genStyles from '../CustomStyles';

const styles = {
  header: 'text-center md:text-left md:text-xl text-base font-semibold mb-6 text-slate-800',
  select: 'w-full mb-4 outline-none px-4 bg-grayTheme py-4 cursor-pointer text-sm rounded-lg focus:border-2 shadow-sm border-black/80 border-[1px]',
  textarea: 'w-full p-4 text-sm bg-grayTheme rounded-lg focus:border-2 shadow-sm border-black/80 border-[1px] resize-none',
  space: 'my-4',
  divider: `${genStyles.flexCenter} gap-4 my-4`,
  iconWrapper: 'flex items-center cursor-pointer bg-purpleTheme font-semibold text-white px-3 py-2 md:text-base text-sm rounded-md w-fit hover:opacity-80',
};

export default styles;