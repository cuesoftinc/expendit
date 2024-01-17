import genStyles from '../CustomStyles';

const styles = {
  container: "bg-[#2C2929] text-white min-h-[380px]",
  copyright: "flex justify-center py-10",
  grid: "grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 pb-10 md:gap-10 gap-5 ml-3",
  first_col:'flex flex-col md:gap-10 gap-5 mb-5',
  logo: "pb-6",
  donate: `px-4 ${genStyles.btn} flex gap-3 bg-[#FCD54D] text-[#414141] rounded-md py-4 w-fit items-center hover:opacity-80`,
  donate_text: `${genStyles.subtext} font-semibold`
}

export default styles