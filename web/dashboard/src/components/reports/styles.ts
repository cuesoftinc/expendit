import genStyles from '@/components/CustomStyles'

const styles = {
  barCont: 'rounded-xl bg-white w-full mt-5 flex flex-col justify-center shadow-lg py-6 md:px-6 px-2',

  // ----- Pie Styles ----
  pieCont: 'flex flex-col bg-white rounded-xl py-6 md:px-6 px-2 shadow-xl',
  header: `${genStyles.header} ${genStyles.flexBtw} md:text-xl text-base`,
  barChart: 'min-w-[700px] h-[400px] mt-12',
  btn: "flex justify-center items-center gap-3 border-[1px] border-slate-600 py-2 rounded-md px-2 text-sm hover:bg-grayTheme"
};

export default styles;