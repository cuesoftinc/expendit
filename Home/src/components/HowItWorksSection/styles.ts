import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad} ${genStyles.flexCenter} min-h-screen CTA-bg`,
  center: 'flex justify-center items-center',
  grid: 'grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 mx-auto gap-4',
  cardContainer: 'py-8 px-4 flex-1 min-h-[200px] flex flex-col gap-3',
  cardTitle: 'md:text-base text-sm',
  cardContent: 'text-sm w-[70%]',
  header: `${genStyles.headerTwo} text-center`,
  icon: 'text-purple-600 bg-purple-300 rounded-md text-2xl mb-4 w-10 h-10 p-2',
}

export default styles