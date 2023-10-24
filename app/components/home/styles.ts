import genStyles from '../CustomStyles';

const styles = {
  // ---- TopBoard Styles ----
  boardCont: `${genStyles.flexBtw} dark:bg-second-dark-bg flex-1 shadow-md rounded-xl min-h-[150px] bg-white mx-2 p-3 relative`,
  leftCont: 'flex flex-col w-[50%]',
  btn: `${genStyles.flexCenter} p-2 h-12 hover:drop-shadow-md hover:bg-white w-12 rounded-full bg-grayTheme `,
  span: `${genStyles.flexCenter} text-2xl `,
  textSm: 'text-sm mt-4 text-gray-400',
  rightCont: 'flex flex-col items-end w-[50%]',
  title: 'mb-2 text-md font-semibold -translate-x-3',
  amount: 'mb-2 text-2xl font-semibold -translate-x-3',
  chartCont: `${genStyles.flexCenter} -translate-x-3 bg-gray-100 rounded-md cursor-pointer hover:bg-white hover:drop-shadow-md px-1`,
  percent: 'mb-2 font-semibold text-gray-500',

  // ---- Chart Styles ----
  lineChartCont: `${genStyles.flexCenter} flex-col rounded-xl mt-10 bg-white h-[360px] w-full shadow-lg`,
  header: 'font-semibold text-xl my-4'
};

export default styles;
