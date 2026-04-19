import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={clsx('animate-pulse rounded bg-coffee-100', className)} />
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
