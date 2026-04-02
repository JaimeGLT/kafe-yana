export const getMarginInfo = (pct: number) => {
  if (pct >= 60) return { label: 'Rentable', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct >= 30) return { label: 'Aceptable', dot: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Revisar precio', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 text-red-700 border-red-200' };
};
