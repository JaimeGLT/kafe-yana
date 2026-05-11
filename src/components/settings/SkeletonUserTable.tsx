import React from 'react';
import { Skeleton } from '../ui';

export const SkeletonUserRow: React.FC = () => (
  <tr className="border-b border-coffee-50">
    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-36" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
    <td className="py-3 px-4 flex justify-center"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
  </tr>
);

export const SkeletonUserTable: React.FC = () => (
  <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
    <div className="p-6">
      <div className="flex justify-end mb-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-coffee-100">
            {['Nombre', 'Apellido', 'Email', 'Rol', 'Teléfono', 'Estado', 'Acciones'].map((h, i) => (
              <th key={i} className="text-left py-3 px-4 font-semibold text-coffee-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonUserRow key={i} />)}
        </tbody>
      </table>
    </div>
  </div>
);
