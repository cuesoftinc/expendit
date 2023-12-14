export const formatNumberWithCommas = (number: string) => {
  const numStr = number.toString();

  const formattedNumber = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return formattedNumber;
}
