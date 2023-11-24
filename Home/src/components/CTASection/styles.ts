import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad} min-h-screen`,
  sectionHeader: `${genStyles.header} text-center`,
  subtext: `${genStyles.subtext} text-center`,
  featuresContainer: 'flex md:flex-row flex-col mt-[7%] gap-12',
  rightSide: 'md:w-1/2 w-full flex flex-col justify-center',
  img: 'rounded-md md:scale-90 scale-100',
  header: `${genStyles.header}`,
  headerTwo: `${genStyles.headerTwo}`,
  subtextTwo: `${genStyles.subtext} mb-4`,
  features: 'flex flex-col gap-4',
  feature: 'flex items-center gap-3 font-semibold md:text-base text-sm',
  btn: `${genStyles.btn} px-12 py-4`,
}

export default styles;