import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad} relative vh-100 services-bg lg:-mt-[10%] -mt-[0] z-30`,
  tabList: (at: number) => `${at >= 2 && 'md:-translate-x-0 sm:-translate-x-[180px] -translate-x-[360px]'} bg-gray-300 px-3 py-2 gap-4 rounded-md font-semibold mb-6 flex md:min-w-[500px] min-w-[800px]`,
  tab: `${genStyles.flexCenter} cursor-pointer rounded-md flex flex-1 py-4 tab`,
  bgBlack: 'bg-black text-white',
  bgGray: 'bg-gray-300 text-black',
  fluid_text: `${genStyles.fluid_text}`,
  img: 'mx-auto object-contain rounded-md w-[75%]'
}

export default styles