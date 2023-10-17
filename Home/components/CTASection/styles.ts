import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad} min-h-screen`,
  sectionHeader: `${genStyles.header} text-center`,
  subtext: `${genStyles.subtext} text-center md:text-lg`,
  featuresContainer: 'flex md:flex-row flex-col mt-[7%] gap-12',
  header: `${genStyles.header}`,
  subtextTwo: `${genStyles.subtext} md:text-lg mb-4`,
  features: 'flex flex-col gap-4',
  feature: 'flex items-center gap-3 font-semibold md:text-base text-sm',
  btn: `${genStyles.btn} px-12 py-4`,
}

export default styles;