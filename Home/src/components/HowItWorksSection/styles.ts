import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  center: 'flex justify-center items-center',
  grid: 'grid grid-cols-1 md:grid-cols-3 mx-auto gap-4',
  cardContainer: 'py-8 px-4 flex-1 min-h-[200px]',
  cardTitle: 'text-xl',
  cardContent: 'mt-4',
  header: 'md:text-5xl text-3xl font-semibold md:leading-[4rem] leading-[3rem] mb-10 text-center',
  icon: 'text-purple-600 bg-purple-300 rounded-md text-2xl mb-4 w-10 h-10 p-2',
}

export default styles