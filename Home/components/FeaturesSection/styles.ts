import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  innerContainer: 'bg-secondary text-white rounded-3xl min-h-screen p-6',
  header: `text-center ${genStyles.header}`,
  cardsContainer: 'flex gap-5 mt-12 md:flex-row flex-col',
  cardContainer: 'border-[1px] border-white py-10 px-6 flex-1 min-h-[400px] rounded-md',
  
}

export default styles;