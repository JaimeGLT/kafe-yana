import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';
import { clsx } from 'clsx';

interface PaginationProps {
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  maxPage?: number;
}

const DEFAULT_PAGE_SIZES = [5, 15, 25, 50];

export const Pagination: React.FC<PaginationProps> = ({
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  isLoading = false,
  maxPage,
}) => {
  const hasPageSizeSelector = onPageSizeChange !== undefined;
const totalPages = Math.ceil(totalCount / pageSize);
  const start = Math.min((page - 1) * pageSize + 1, totalCount);
  const end = Math.min(page * pageSize, totalCount);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-coffee-100 bg-white">
      {hasPageSizeSelector ? (
        <div className="flex items-center gap-2 text-sm text-coffee-500 whitespace-nowrap">
          <span>Mostrando</span>
          <Select
            value={String(pageSize)}
            onChange={(v) => {
              const newSize = Number(v);
              const newPage = Math.min(page, Math.ceil(totalCount / newSize));
              onPageSizeChange!(newSize);
              onPageChange(newPage);
            }}
            options={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
          />
          <span>resultados</span>
          {totalCount > 0 && (
            <span className="text-coffee-400">
              ({start}–{end} de {totalCount})
            </span>
          )}
        </div>
      ) : (
        <div className="text-sm text-coffee-500 whitespace-nowrap">
          {totalCount > 0 && (
            <span>Mostrando {start}–{end} de {totalCount}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className={clsx(
            'p-1.5 rounded-lg border text-coffee-500 transition-colors',
            page === 1 || isLoading
              ? 'border-coffee-100 text-coffee-200 cursor-not-allowed'
              : 'border-coffee-200 hover:bg-coffee-50 hover:text-coffee-700'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-coffee-400">…</span>
          ) : (
            (() => {
              const isUnreachable = maxPage !== undefined && (p as number) > maxPage;
              return (
                <button
                  key={p}
                  onClick={() => !isUnreachable && onPageChange(p as number)}
                  disabled={isLoading || isUnreachable}
                  title={isUnreachable ? 'Navega secuencialmente para llegar a esta página' : undefined}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    p === page
                      ? 'bg-coffee-800 text-white'
                      : isUnreachable
                        ? 'text-coffee-200 border border-coffee-100 cursor-not-allowed'
                        : 'text-coffee-600 hover:bg-coffee-50 border border-coffee-200'
                  )}
                >
                  {p}
                </button>
              );
            })()
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          className={clsx(
            'p-1.5 rounded-lg border text-coffee-500 transition-colors',
            page === totalPages || isLoading
              ? 'border-coffee-100 text-coffee-200 cursor-not-allowed'
              : 'border-coffee-200 hover:bg-coffee-50 hover:text-coffee-700'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};