export const formatNumberWithCommas = (number: any) => {
  const numStr = number.toString();

  const formattedNumber = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return formattedNumber;
}
