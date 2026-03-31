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
