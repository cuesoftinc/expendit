export const getLocalStorageItem = (key: string): any | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};
