export function generatePagination(currentPage: number, totalPages: number) {
  const visiblePages = 3;
  const pages = [];

  // Display the first three pages
  for (let i = 1; i <= Math.min(visiblePages, totalPages); i++) {
    pages.push(i);
  }

  // If there are more than three pages, add dots
  if (totalPages > visiblePages) {
    // If the current page is more than two pages away from the start, add dots
    if (currentPage > visiblePages - 1) {
      pages.push('...');
    }

    // Calculate the starting point for the numbers to be displayed before the last page
    const start = Math.max(currentPage - 1, visiblePages);

    // Display numbers from start to the last page
    for (let i = start; i <= totalPages; i++) {
      pages.push(i);
    }
  }

  return pages;
}

