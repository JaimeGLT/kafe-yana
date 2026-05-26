import React, { useRef, useEffect } from 'react';
import { Bell, Loader2, Package, FlaskConical } from 'lucide-react';
import { useNotifications } from '../../contexts';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { products, insumos, isLoading, hasLoaded } = useNotifications();

  const alertProducts = products.filter((p) => !p.isActive);
  const alertInsumos = insumos.filter((i) => i.stock_actual <= i.stock_min);
  const totalCount = alertProducts.length + alertInsumos.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-coffee-50 transition-colors"
        aria-label="Notificaciones de inventario"
      >
        {isLoading && !hasLoaded ? (
          <Loader2 className="h-5 w-5 text-coffee-500 animate-spin" />
        ) : (
          <Bell className="h-5 w-5 text-coffee-600" />
        )}
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-lg border border-coffee-200 shadow-lg z-30 overflow-hidden md:absolute md:top-auto md:left-auto md:translate-x-0 md:right-0 md:mt-1 md:w-80">
          <div className="px-4 py-3 border-b border-coffee-100">
            <p className="text-sm font-semibold text-coffee-900">Alertas de inventario</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {totalCount === 0 ? (
              <p className="px-4 py-6 text-sm text-coffee-500 text-center">Sin alertas de inventario</p>
            ) : (
              <>
                {alertProducts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-coffee-50">
                      <Package className="h-3.5 w-3.5 text-coffee-500" />
                      <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                        Productos sin stock ({alertProducts.length})
                      </p>
                    </div>
                    {alertProducts.map((p) => {
                      const critico = p.stock <= p.minStock * 0.30;
                      return (
                        <div key={p.id} className="px-4 py-2.5 border-b border-coffee-50 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-coffee-800 truncate">{p.name}</p>
                            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              critico ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {critico ? 'Crítico' : 'A punto'}
                            </span>
                          </div>
                          <p className="text-xs text-coffee-500 capitalize mt-0.5">
                            {p.tipo} · Stock: {p.stock}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {alertInsumos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-coffee-50">
                      <FlaskConical className="h-3.5 w-3.5 text-coffee-500" />
                      <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                        Insumos por reabastecer ({alertInsumos.length})
                      </p>
                    </div>
                    {alertInsumos.map((i) => {
                      const critico = i.stock_actual <= i.stock_min * 0.30;
                      return (
                        <div key={i.id} className="px-4 py-2.5 border-b border-coffee-50 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-coffee-800 truncate">{i.name}</p>
                            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              critico ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {critico ? 'Crítico' : 'A punto'}
                            </span>
                          </div>
                          <p className="text-xs text-coffee-500 mt-0.5">
                            Stock: {Math.ceil(i.stock_actual / i.factor_conversion)} {i.unidad_compra} · Mín: {Math.ceil(i.stock_min / i.factor_conversion)} {i.unidad_compra}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
