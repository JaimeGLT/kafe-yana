import React, { useState } from 'react';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
}

const DEFAULT_PAGE_SIZES = [5, 15, 25, 50, 100];

export const Pagination: React.FC<PaginationProps> = ({
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  isLoading = false,
}) => {
  const hasPageSizeSelector = onPageSizeChange !== undefined;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = Math.min((page - 1) * pageSize + 1, totalCount);
  const end = Math.min(page * pageSize, totalCount);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const baseBtn =
    'h-8 min-w-8 px-1.5 rounded-lg border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-400';
  const idleBtn = 'border-coffee-200 text-coffee-600 hover:bg-coffee-50';
  const disabledBtn = 'border-coffee-100 text-coffee-200 cursor-not-allowed';

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-t border-coffee-100 bg-white sm:flex-row sm:items-center sm:justify-between">
      {/* ── Left: page-size + count ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-coffee-500 whitespace-nowrap">
        {hasPageSizeSelector ? (
          <>
            <span>Mostrando</span>
            <Select
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange!(Number(v))}
              options={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
            />
            <span>resultados</span>
            {totalCount > 0 && (
              <span className="text-coffee-400">
                ({start}–{end} de {totalCount})
              </span>
            )}
          </>
        ) : (
          totalCount > 0 && <span>Mostrando {start}–{end} de {totalCount}</span>
        )}
      </div>

      {/* ── Right: page navigation ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap -mx-1 px-1">
        {/* Primera página */}
        <button
          type="button"
          aria-label="Primera página"
          onClick={() => onPageChange(1)}
          disabled={page === 1 || isLoading}
          className={clsx(baseBtn, page === 1 || isLoading ? disabledBtn : idleBtn)}
        >
          <ChevronFirst className="h-4 w-4 mx-auto" />
        </button>

        {/* Anterior */}
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className={clsx(baseBtn, page === 1 || isLoading ? disabledBtn : idleBtn)}
        >
          <ChevronLeft className="h-4 w-4 mx-auto" />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1 text-coffee-400 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p as number)}
              disabled={isLoading}
              className={clsx(
                baseBtn,
                p === page
                  ? 'bg-coffee-800 border-coffee-800 text-white'
                  : clsx(isLoading ? disabledBtn : idleBtn),
              )}
            >
              {p}
            </button>
          ),
        )}

        {/* Siguiente */}
        <button
          type="button"
          aria-label="Página siguiente"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          className={clsx(baseBtn, page === totalPages || isLoading ? disabledBtn : idleBtn)}
        >
          <ChevronRight className="h-4 w-4 mx-auto" />
        </button>

        {/* Última página */}
        <button
          type="button"
          aria-label="Última página"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || isLoading}
          className={clsx(baseBtn, page === totalPages || isLoading ? disabledBtn : idleBtn)}
        >
          <ChevronLast className="h-4 w-4 mx-auto" />
        </button>

        {/* Ir a página N */}
        <GoToPage
          totalPages={totalPages}
          onGoTo={onPageChange}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

/** Sub-componente: input numérico pequeño que valida rango y dispara onGoTo. */
const GoToPage: React.FC<{
  totalPages: number;
  onGoTo: (n: number) => void;
  disabled?: boolean;
}> = ({ totalPages, onGoTo, disabled }) => {
  const [value, setValue] = useState('');

  const submit = () => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(1, Math.min(totalPages, n));
    onGoTo(clamped);
    setValue('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="ml-2 flex items-center gap-1 text-sm text-coffee-500"
    >
      <span className="hidden sm:inline">Ir a</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="N"
        aria-label="Ir a página"
        className="w-12 h-8 text-center border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 disabled:bg-coffee-50 disabled:text-coffee-300"
      />
      <button
        type="submit"
        disabled={disabled || value === ''}
        className="h-8 px-2 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-400"
      >
        Ir
      </button>
    </form>
  );
};