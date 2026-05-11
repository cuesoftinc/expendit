import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad} `,
  innerContainer: 'bg-gradient-to-r from-purple-200 to-purple-400 rounded-lg min-h-screen md:pb-[100px] pb-[50px] md:pt-[50px] pt-[25px]',
  header: `mb-10 ${genStyles.header}`,
  grid: 'grid grid-cols-1 lg:grid-cols-2 m-auto md:px-8 py-8 px-2',
  listItem: "mb-10",
  itemWrapper: "flex gap-4",
  icon: "text-purple-500 text-2xl",
  itemParagraph: "md:w-96 mt-2 font-semibold",
  form: "bg-white md:p-8 p-4 xl:mx-12 mx-0 rounded-lg",
  inputContainer: "flex flex-col text-slate-800 py-2",
  input: "rounded-md mt-2 p-3 bg-[#EBEBEB] focus:border-2",
  submit: "cursor-pointer w-full mx-auto font-semibold",
  btn: `mt-10 p-2 py-4 text-center rounded-md text-white bg-purple-400 hover:opacity-90`,
  textarea: "rounded-lg mt-2 p-3 bg-[#EBEBEB] focus:border-2 resize-none"
}

export default styles;