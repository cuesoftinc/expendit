import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  center: 'flex justify-center items-center',
  grid: 'grid grid-cols-1 md:grid-cols-3 mx-auto gap-4',
  card: 'flex gap-4 p-4 border rounded-lg shadow-lg bg-white',
  cardContainer: 'border-[1px] shadow-lg bg-white py-8 px-4 flex-1 min-h-[200px] rounded-md',
  cardTitle: 'text-xl flex justify-center',
  cardContent: 'text-center mt-4',
  header: 'md:text-5xl text-3xl font-semibold md:leading-[4rem] leading-[3rem] mb-10 text-center',
  icon: 'flex justify-center text-purple-500 text-2xl mb-4',
}

export default styles