import React from 'react';
import { clsx } from 'clsx';
import { UtensilsCrossed, PenLine, Trash2 } from 'lucide-react';

type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago' | 'parcial_pagado';

type StatusCfg = Record<MesaStatus, {
  label: string; dot: string; card: string; badge: string; icon: string; iconBg: string
}>;

/** Forma mínima de una mesa que MesaCard necesita recibir. Compatible
 *  con `LocalMesa` (extiende con `totalAbonado` que POSPage computa). */
interface MesaCardMesa {
  id: string;
  number?: number;
  name: string;
  status: MesaStatus | string;
  tipo?: string;
  openedAt?: number;
  order: Array<{ quantity: number; precioFinal: number }>;
  customerId?: string;
  cliente?: { id: number; nombre: string; puntos: number; celular: string; estado: boolean };
  currentRound?: number;
  roundsSent?: Array<{ number: number; sentAt: number; subTotal: number; rondaId?: number }>;
  pedidoId?: number;
  abonos?: Array<unknown>;
  saldo?: number;
  itemsPagados?: Record<number, number>;
  /** Total abonado hasta el momento (computado en POSPage). */
  totalAbonado?: number;
  [key: string]: unknown;
}

interface MesaCardProps {
  mesa: MesaCardMesa;
  statusCfg: StatusCfg;
  formatCurrency: (n: number) => string;
  mesaOrderTotal: (order: Array<{ precioFinal: number; quantity: number }>) => number;
  onOpen: (mesaId: string, view: 'iniciar' | 'detalle') => void;
  onEdit: (mesa: MesaCardMesa, e: React.MouseEvent) => void;
  onDelete: (mesaId: string, e: React.MouseEvent) => void;
  isDeletingMesa: string | null;
}

export const MesaCard: React.FC<MesaCardProps> = ({
  mesa,
  statusCfg,
  formatCurrency,
  mesaOrderTotal,
  onOpen,
  onEdit,
  onDelete,
  isDeletingMesa,
}) => {
  const cfg = statusCfg[mesa.status as MesaStatus];
  const total = mesaOrderTotal(mesa.order);
  const itemCount = mesa.order.reduce((s, i) => s + i.quantity, 0);
  const isLibre = mesa.status === 'libre';
  const isParcialPagado = mesa.status === 'parcial_pagado';
  const saldo = mesa.saldo ?? 0;
  const totalAbonado = mesa.totalAbonado ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(mesa.id, isLibre ? 'iniciar' : 'detalle')}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onOpen(mesa.id, isLibre ? 'iniciar' : 'detalle');
        }
      }}
      className={clsx(
        'group relative flex flex-col items-center cursor-pointer',
        'border-2 rounded-2xl p-4 transition-all duration-200',
        'active:scale-95',
        cfg.card,
      )}
    >
      <div className={clsx('absolute top-3 left-3 h-2 w-2 rounded-full', cfg.dot)} />

      {isLibre && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity">
          <button
            onClick={e => onEdit(mesa, e)}
            className="h-6 w-6 rounded-lg bg-coffee-700 hover:bg-coffee-600 flex items-center justify-center text-coffee-300 hover:text-white"
            title="Renombrar"
          >
            <PenLine className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(mesa.id, e); }}
            disabled={isDeletingMesa === mesa.id}
            className="h-6 w-6 rounded-lg bg-coffee-700 hover:bg-red-600 flex items-center justify-center text-coffee-300 hover:text-white disabled:opacity-50"
            title="Eliminar mesa"
          >
            {isDeletingMesa === mesa.id ? (
              <div className="w-3 h-3 border-2 border-coffee-300/40 border-t-coffee-300 rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </button>
        </div>
      )}

      <div className={clsx(
        'h-11 w-11 rounded-xl flex items-center justify-center mt-3 mb-2',
        cfg.iconBg,
      )}>
        <UtensilsCrossed className={clsx('h-5 w-5', cfg.icon)} />
      </div>

      <p className="font-semibold text-white text-sm leading-tight text-center">
        {mesa.name}
      </p>

      <span className={clsx('mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
        {cfg.label}
      </span>

      {!isLibre && (
        <div className="mt-2.5 w-full space-y-0.5 text-center">
          {itemCount > 0 && (
            <p className="text-xs text-coffee-300">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          )}
          {isParcialPagado && totalAbonado > 0 ? (
            <>
              <p className="text-[10px] text-emerald-300/90 line-through">{formatCurrency(total)}</p>
              <p className="text-[11px] text-emerald-300 font-semibold">Pagado {formatCurrency(totalAbonado)}</p>
              <p className="text-sm font-bold text-orange-200">Saldo {formatCurrency(saldo)}</p>
            </>
          ) : (
            total > 0 && <p className="text-sm font-bold text-white">{formatCurrency(total)}</p>
          )}
        </div>
      )}
    </div>
  );
};