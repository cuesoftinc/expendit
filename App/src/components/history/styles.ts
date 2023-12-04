import genStyles from '../CustomStyles';
import expenseStyle from '../home/styles';

const styles = {
  container: 'w-full min-h-[650px] bg-white rounded-xl md:p-6 p-3 flex flex-col shadow-xl',
  header: `${genStyles.flexBtw} my-2 md:mb-8 mb-4`,
  headerText: 'font-semibold md:text-xl text-lg',
  transactionsHeader: `${expenseStyle.transactionsHeader}`,
  transactionsContainer: `${expenseStyle.transactionsContainer}`,
  filterBtn: `${genStyles.flexCenter} font-semibold gap-2 bg-grayTheme rounded-md py-2 px-4 hover:opacity-80`,
  panel: 'p-4 z-40 min-w-[250px] shadow-md -left-[150px] top-[45px] min-h-[200px] rounded-md bg-grayTheme absolute',
  category: 'hover:bg-purple-100 p-2 rounded-md my-2 cursor-pointer md:text-base text-sm',

  arrow: (cp: number, tl: number, side: string) =>  `cursor-pointer ${side === "back" ? cp === 1 && 'opacity-50' : cp == tl && 'opacity-50'}`,
}

export default styles