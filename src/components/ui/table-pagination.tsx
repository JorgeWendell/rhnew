"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 10;

type TablePaginationProps = {
  totalItems: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
};

function getVisiblePages(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 2) return [1, 2, 3, 4, 5];
  if (current >= total - 1) return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}

export function TablePagination({
  totalItems,
  currentPage,
  onPageChange,
  pageSize = ITEMS_PER_PAGE,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const visible = getVisiblePages(currentPage, totalPages);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasPrev) onPageChange(currentPage - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasNext) onPageChange(currentPage + 1);
  };

  const handlePage = (page: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange(page);
  };

  if (totalItems <= pageSize) return null;

  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={handlePrev}
            className={!hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
            aria-disabled={!hasPrev}
          />
        </PaginationItem>
        {visible[0]! > 1 && (
          <>
            <PaginationItem>
              <PaginationLink href="#" onClick={handlePage(1)} className="cursor-pointer">
                1
              </PaginationLink>
            </PaginationItem>
            {visible[0]! > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
          </>
        )}
        {visible.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              href="#"
              onClick={handlePage(p)}
              isActive={currentPage === p}
              className="cursor-pointer"
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        {visible[visible.length - 1]! < totalPages && (
          <>
            {visible[visible.length - 1]! < totalPages - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={handlePage(totalPages)}
                className="cursor-pointer"
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={handleNext}
            className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
            aria-disabled={!hasNext}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export const TABLE_PAGE_SIZE = ITEMS_PER_PAGE;
