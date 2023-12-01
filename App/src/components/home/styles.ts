import genStyles from '../CustomStyles';

const styles = {
  // ---- TopBoard Styles ----
  boardCont: `${genStyles.flexBtw} flex-1 shadow-md rounded-xl min-h-[150px] bg-white mx-2 p-3 relative`,
  leftCont: 'flex flex-col w-[50%] gap-1',
  btn: `${genStyles.flexCenter} p-2 h-12 hover:drop-shadow-md hover:bg-white w-12 rounded-full bg-grayTheme `,
  span: `${genStyles.flexCenter} text-2xl `,
  textSm: 'text-sm mt-4 text-gray-400',
  rightCont: 'flex flex-col items-end w-[50%] gap-0.5 text-slate-800',
  title: 'mb-2 text-md font-semibold mr-3',
  amount: 'mb-2 text-2xl font-semibold mr-3 flex items-center',
  chartCont: `${genStyles.flexCenter} mr-3 py-1 bg-gray-100 rounded-md cursor-pointer hover:bg-white hover:drop-shadow-md px-1`,
  percent: 'font-semibold text-gray-500',

  // ---- Chart Styles ----
  lineChartCont: `${genStyles.flexCenter} flex-col rounded-xl mt-10 bg-white min-h-[450px] w-full shadow-lg`,
  header: 'font-semibold text-xl my-4 text-slate-800',

  // ---- LatestExpenses Styles ----
  barContainer: 'bg-white shadow-lg rounded-xl flex-1 mr-2 p-4 my-4',
  transactionHeader: `${genStyles.flexBtw} mb-6 font-semibold text-slate-800`,
  transactionsContainer: 'flex flex-col',
  link: 'cursor-pointer underline hover:text-purpleTheme',
  transactionsHeader: `${genStyles.flexBtw} md:text-base font-semibold sm:text-[0.9rem] text-[0.85rem] text-slate-600 mb-3 bg-grayTheme p-4`,
  transactionContainer: `${genStyles.flexBtw} md:text-[0.9rem] sm:text-sm text-[0.8rem] mb-3 bg-grayTheme rounded-lg p-4`,
  text: 'flex-1 flex items-center',
};

export default styles;
