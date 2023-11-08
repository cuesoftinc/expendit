import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  innerContainer: 'bg-gradient-to-r from-purple-200 to-purple-400 text-black rounded-3xl min-h-screen p-6 mb-12',
  header: `mb-10 ${genStyles.header}`,
  grid: 'grid grid-cols-1 sm:grid-cols-2 m-auto p-8',
  listItem: "mb-10",
  itemWrapper: "flex gap-4",
  icon: "text-purple-500 text-2xl",
  itemParagraph: "md:w-96 mt-2 font-semibold",
  form: "bg-white p-8 md:mx-12 rounded-lg",
  inputContainer: "flex flex-col text-slate-800 py-2",
  input: "rounded-lg mt-2 p-3 bg-slate-100 focus:border-slate-300 focus:bg-slate-400",
  submit: "cursor-pointer w-full mx-auto font-semibold",
  btn: `mt-10 p-2 py-4 text-center rounded-md text-white bg-purple-400 hover:opacity-90`,
  textarea: "rounded-lg mt-2 p-3 bg-slate-100 focus:border-slate-300 focus:bg-slate-400 resize"
}

export default styles;