import { useState, useMemo } from 'react';

export function usePagination(initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const totalPages = useMemo(() => {
    if (totalCount === null) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  const nextPage = () => setPage((prev) => Math.min(totalPages, prev + 1));
  const prevPage = () => setPage((prev) => Math.max(1, prev - 1));
  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
    setTotalCount,
    nextPage,
    prevPage,
    goToPage
  };
}
