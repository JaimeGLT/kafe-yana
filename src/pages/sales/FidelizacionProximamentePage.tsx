import React from 'react';
import { Hammer } from 'lucide-react';
import { MainLayout } from '../../components/layout';

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const FidelizacionProximamentePage: React.FC<Props> = ({
  title,
  subtitle,
  icon,
}) => (
  <MainLayout>
    {/* Hero */}
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
      <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {icon ?? <Hammer className="w-5 h-5 text-yellow-300" />}
          </div>
          <span className="font-accent text-cream-light text-lg">Fidelización</span>
        </div>
        <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
          <span className="text-yellow-300">{title}</span>
        </h1>
        {subtitle && (
          <p className="text-coffee-200 font-body text-sm">{subtitle}</p>
        )}
      </div>
    </div>

    {/* Coming soon card */}
    <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-coffee-50 border border-coffee-100 flex items-center justify-center mb-5">
        <Hammer className="w-8 h-8 text-coffee-300" />
      </div>
      <h2 className="font-display font-bold text-coffee-800 text-xl mb-2">
        Próximamente
      </h2>
      <p className="font-body text-coffee-500 text-sm max-w-xs">
        Esta sección está en construcción. Pronto estará disponible.
      </p>
    </div>
  </MainLayout>
);
