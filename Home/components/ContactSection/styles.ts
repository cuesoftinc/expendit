import genStyles from '../CustomStyles';

const styles = {
  sectionContainer: `${genStyles.pagePad}`,
  innerContainer: 'bg-secondary text-white rounded-3xl min-h-screen p-6',
  header: `mb-10 ${genStyles.header}`,
  btn: `mt-10 p-2 ${genStyles.btn}`,
  grid: 'grid grid-cols-1 sm:grid-cols-2 m-auto p-8',
  listItem: "mb-16",
  itemWrapper: "flex gap-4",
  icon: "text-purple-500 text-2xl",
  itemParagraph: "md:w-96 mt-4",
  form: "bg-purple-200 p-8 md:mx-12 rounded-lg",
  inputContainer: "flex flex-col text-slate-800 py-2",
  input: "rounded-lg mt-2 p-2 focus:border-slate-300 focus:bg-slate-100",
  submit: "cursor-pointer w-full mx-auto"
}

export default styles;