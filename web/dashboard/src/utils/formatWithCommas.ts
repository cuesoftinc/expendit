export const formatNumberWithCommas = (number: any) => {
  if (number !== undefined) {
    const numStr = number.toString();
    const formattedNumber = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return formattedNumber;
  }

  return "";
}
