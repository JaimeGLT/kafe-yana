import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, style }) => (
  <div className={clsx('animate-pulse rounded bg-coffee-100', className)} style={style} />
);

export const SkeletonRecetaCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-5 py-4 flex items-center gap-3">
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
    <div className="hidden sm:flex flex-col items-end gap-1.5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="hidden sm:flex flex-col items-end gap-1.5">
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-4 w-14" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
    <Skeleton className="h-6 w-14" />
    <Skeleton className="h-4 w-4 rounded" />
  </div>
);

export const SkeletonRow: React.FC = () => (
  <tr className="border-b border-coffee-50">
    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
    <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
    <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
    <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
    <td className="px-4 py-3"><Skeleton className="h-5 w-14 mx-auto rounded-full" /></td>
    <td className="px-4 py-3"><Skeleton className="h-6 w-12 ml-auto" /></td>
  </tr>
);

export const SkeletonStatCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-5 py-4">
    <Skeleton className="h-3 w-20 mb-3" />
    <Skeleton className="h-7 w-16 mb-2" />
    <Skeleton className="h-3 w-12" />
  </div>
);

export const SkeletonKpiCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-12" />
    </div>
  </div>
);

export const SkeletonProductForm: React.FC = () => (
  <div className="space-y-5">
    {/* Name + Barcode */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    {/* Description */}
    <div className="space-y-1.5">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
    {/* Category + Unit */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    {/* Cost + Sale price */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    {/* Stock */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    {/* Toggle */}
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-3.5 w-36" />
    </div>
    {/* Actions */}
    <div className="flex justify-end gap-3 pt-2">
      <Skeleton className="h-9 w-20 rounded-lg" />
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  </div>
);

export const SkeletonAjusteRow: React.FC = () => (
  <tr className="border-b border-coffee-50">
    <td className="pl-5 pr-4 py-4">
      <Skeleton className="h-4 w-20 mb-1.5" />
      <Skeleton className="h-3 w-12" />
    </td>
    <td className="px-4 py-4">
      <Skeleton className="h-4 w-36 mb-1.5" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </td>
    <td className="px-4 py-4 text-center">
      <Skeleton className="h-6 w-16 rounded-full mx-auto" />
    </td>
    <td className="px-4 py-4 text-center">
      <Skeleton className="h-4 w-20 mx-auto" />
    </td>
    <td className="px-4 py-4 text-right">
      <Skeleton className="h-4 w-16 ml-auto" />
    </td>
    <td className="px-4 py-4">
      <Skeleton className="h-5 w-24 rounded-full" />
    </td>
    <td className="pr-5 pl-4 py-4">
      <Skeleton className="h-3 w-20" />
    </td>
  </tr>
);

export const SkeletonMesaCard: React.FC = () => (
  <div className="relative border-2 border-coffee-500/30 rounded-2xl p-4 flex flex-col items-center bg-coffee-800/50">
    <div className="absolute top-3 left-3 h-2 w-2 rounded-full bg-coffee-400" />
    <div className="h-11 w-11 rounded-xl bg-coffee-800/70 flex items-center justify-center mt-3 mb-2">
      <div className="h-5 w-5 rounded bg-coffee-600" />
    </div>
    <Skeleton className="h-4 w-16 mb-2 rounded" />
    <Skeleton className="h-5 w-14 rounded-full bg-emerald-500/20" />
  </div>
);

export const SkeletonMesaGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
    {Array.from({ length: count }).map((_, i) => <SkeletonMesaCard key={i} />)}
  </div>
);

export const SkeletonProductCard: React.FC = () => (
  <div className="flex-shrink-0 w-28 sm:w-32 bg-white rounded-xl border border-coffee-100 shadow-sm p-3 flex flex-col items-center gap-2">
    <Skeleton className="h-10 w-10 rounded-full" />
    <Skeleton className="h-3 w-20 rounded" />
    <Skeleton className="h-4 w-16 rounded" />
    <Skeleton className="h-6 w-full rounded-lg" />
  </div>
);

export const SkeletonProductGrid: React.FC = () => (
  <div className="px-4 pt-3 pb-1 flex-shrink-0">
    <Skeleton className="h-8 w-full rounded-xl" />
  </div>
);

export const SkeletonCategoryTabs: React.FC = () => (
  <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0">
    {[80, 100, 70, 90, 60].map((w, i) => (
      <Skeleton key={i} className="h-8 flex-shrink-0 rounded-full" style={{ width: w }} />
    ))}
  </div>
);

export const SkeletonProductScroll: React.FC = () => (
  <div className="flex gap-2.5 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 border-b border-coffee-100">
    {Array.from({ length: 8 }).map((_, i) => <SkeletonProductCard key={i} />)}
  </div>
);

export const SkeletonSalesRow: React.FC = () => (
  <tr className="border-b border-coffee-50">
    <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
    <td className="px-6 py-4"><Skeleton className="h-4 w-36" /></td>
    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="px-6 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
    <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
    <td className="px-6 py-4"><Skeleton className="h-6 w-8" /></td>
  </tr>
);

export const SkeletonSalesTable: React.FC = () => (
  <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
    <table className="min-w-full divide-y divide-coffee-200">
      <thead className="bg-coffee-50">
        <tr>
          {['Código', 'Fecha', 'Cliente', 'Productos', 'Total', 'Pago', 'Estado', ''].map((h, i) => (
            <th key={i} className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-coffee-100">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonSalesRow key={i} />)}
      </tbody>
    </table>
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
    <div className="px-6 py-4 border-b border-coffee-100">
      <Skeleton className="h-5 w-48" />
    </div>
    <div className="p-6">
      <Skeleton className="w-full h-72 rounded-lg" />
    </div>
  </div>
);

export const SkeletonActivityList: React.FC<{ rows?: number; className?: string }> = ({ rows = 5, className }) => (
  <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
    <div className="px-6 py-4 border-b border-coffee-100">
      <Skeleton className="h-5 w-36" />
    </div>
    <div className="divide-y divide-coffee-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-12 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);
