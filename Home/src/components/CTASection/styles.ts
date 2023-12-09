import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad} min-h-screen`,
  sectionHeader: `${genStyles.header} text-center`,
  subtext: `${genStyles.subtext} text-center`,
  featuresContainer: 'flex lg:flex-row flex-col mt-[7%] gap-12',
  rightSide: 'lg:w-1/2 w-full flex flex-col justify-center',
  img: 'rounded-md lg:scale-90 scale-100',
  header: `${genStyles.header}`,
  headerTwo: `${genStyles.headerTwo}`,
  subtextTwo: `${genStyles.subtext} mb-6`,
  features: 'flex flex-col gap-6',
  feature: 'flex items-center gap-3 font-semibold md:text-base text-sm',
  btn: `${genStyles.btn} hover:bg-purple-500 btn-gradient px-12 py-4 text-white`,
}

export default styles;