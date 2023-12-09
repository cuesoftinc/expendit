import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  header: `${genStyles.headerTwo} text-center`,
  sub_text: `${genStyles.subtext}`,
  section_wrapper: 'flex flex-col gap-8 mt-10',
  box_wrapper: 'flex gap-6 flex-col lg:flex-row',
  card: 'relative flex-1 min-h-[200px] open-source-card flex flex-col gap-4',
  gap_10: 'flex md:gap-10 items-center gap-6',
  gap_6: 'flex items-center md:gap-6 gap-3',
  icon_bg: `${genStyles.flexCenter} rounded-[0.7rem] md:min-w-[3.5rem] md:min-h-[3.5rem] min-h-[2.5rem] min-w-[2.5rem] cursor-pointer hover:opacity-80 p-4`,
  discord: 'bg-[#5956FD] ',
  github: " bg-[#2C2929]",
  btn_one: `${genStyles.btn} px-8 py-4 hover:bg-purple-500 btn-gradient text-white flex items-center gap-3 justify-center`,
  box_header: 'font-bold md:text-2xl text-xl',
  box_text: 'text-sm w-[70%]',
  partner: 'flex items-center md:gap-3 gap-1 font-bold mt-[3rem] hover:underline cursor-pointer'
}

export default styles