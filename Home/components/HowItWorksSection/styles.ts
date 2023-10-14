import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  number: `rounded-full p-2 px-2 text-white bg-purple-500 flex justify-center items-center max-h-[40px]`,
  center: 'flex justify-center items-center',
  grid: 'grid grid-cols-1 md:grid-cols-3 mx-auto gap-4',
  card: 'flex gap-4 p-4 border rounded-lg shadow-lg bg-white',
  cardContainer: 'border-[1px] shadow-lg bg-white py-8 px-4 flex-1 min-h-[200px] rounded-md flex gap-4',
  header: 'md:text-5xl text-3xl font-semibold md:leading-[4rem] leading-[3rem] mb-4 text-center',
}

export default styles