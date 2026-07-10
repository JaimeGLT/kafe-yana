import React from 'react';
import { Printer, X, MonitorCheck, UtensilsCrossed, GlassWater } from 'lucide-react';
import { enviarCuenta } from '../../utils/comandas';
import { formatCurrency } from '../../utils';
import type { Sale } from '../../types';

interface SaleReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

type Destino = 'principal' | 'cocina' | 'barra';
type Tamaño = 'pequeño' | 'mediano';

const DESTINO_CONFIG: { id: Destino; label: string; icon: React.ReactNode }[] = [
  { id: 'principal', label: 'Principal', icon: <MonitorCheck className="h-4 w-4" /> },
  { id: 'cocina',    label: 'Cocina',    icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'barra',     label: 'Barra',     icon: <GlassWater className="h-4 w-4" /> },
];

const TAMAÑO_CONFIG: { id: Tamaño; label: string; mm: string }[] = [
  { id: 'pequeño', label: 'Pequeño (58mm)', mm: '58mm' },
  { id: 'mediano', label: 'Mediano (80mm)', mm: '80mm' },
];

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({ sale, onClose }) => {
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [destinos, setDestinos] = React.useState<Destino[]>(['principal']);
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');

  React.useEffect(() => {
    if (!sale) return;
    const set = new Set<Destino>(['principal']);
    for (const item of sale.items) {
      if (item.ubicacion === 'cocina' || item.ubicacion === 'barra') {
        set.add(item.ubicacion as Destino);
      }
    }
    setDestinos([...set]);
  }, [sale]);

  const toggleDestino = (d: Destino) =>
    setDestinos(prev =>
      prev.includes(d)
        ? prev.length > 1 ? prev.filter(x => x !== d) : prev
        : [...prev, d]
    );

  if (!sale) return null;

  const metodoPago = sale.paymentMethods.map(p => p.name).join(' + ') || 'Efectivo';

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await enviarCuenta(
        sale.customerName ?? sale.code,
        sale.code,
        sale.items.map(item => ({
          cantidad: item.quantity,
          nombre: item.productName ?? 'Producto',
          precio: item.unitPrice,
          total: item.total,
          ubicacion: item.ubicacion,
        })),
        sale.total,
        metodoPago,
        destinos,
      );
    } finally {
      setIsPrinting(false);
      onClose();
    }
  };

  const handleBrowserPrint = () => {
    const mm = TAMAÑO_CONFIG.find(t => t.id === tamaño)?.mm ?? '80mm';
    const previewWidth = tamaño === 'pequeño' ? 240 : 320;
    const win = window.open('', '_blank', `width=${previewWidth},height=600`);
    if (!win) return;

    const rows = sale.items.map(item => `
      <tr>
        <td style="padding:2px 0">${item.quantity}x ${item.productName ?? 'Producto'}</td>
        <td style="text-align:right;padding:2px 0">${formatCurrency(item.unitPrice)}</td>
        <td style="text-align:right;padding:2px 0">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    const payRows = sale.paymentMethods.map(p => `
      <tr>
        <td colspan="2" style="padding:2px 0">${p.name}</td>
        <td style="text-align:right;padding:2px 0">${formatCurrency(p.amount)}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Cuenta ${sale.code}</title>
        <style>
          @page { size: ${mm} auto; margin: 0; }
          body { font-family: monospace; font-size: 13px; margin: 0; padding: 2mm; width: ${mm}; box-sizing: border-box; }
          h2 { text-align: center; margin: 0 0 4px; font-size: 16px; }
          p { text-align: center; margin: 2px 0; font-size: 11px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 4px; font-size: 11px; }
          th:last-child, td:last-child { text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .total-row td { font-weight: bold; font-size: 15px; padding-top: 4px; }
          @media print { body { padding: 1mm; } }
        </style>
      </head>
      <body>
        <h2>Kafe Yana</h2>
        <p>${sale.customerName ? `Cliente: ${sale.customerName}` : ''}</p>
        <p>${new Date(sale.date).toLocaleString('es-PE')}</p>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align:right">P.Unit</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr><td colspan="3"><div class="divider"></div></td></tr>
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td>${formatCurrency(sale.total)}</td>
            </tr>
            <tr><td colspan="3"><div class="divider"></div></td></tr>
            ${payRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <p style="margin-top:8px">¡Gracias por su visita!</p>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-coffee-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">Imprimir cuenta</p>
              <p className="text-xs text-coffee-400">{sale.customerName ?? 'Sin cliente'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview de items */}
        <div className="bg-coffee-50 rounded-2xl p-4 space-y-2 max-h-56 overflow-y-auto">
          {sale.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-coffee-700">
                {item.quantity}x {item.productName}
              </span>
              <div className="text-right">
                <span className="text-coffee-400 text-xs mr-2">{formatCurrency(item.unitPrice)} c/u</span>
                <span className="font-semibold text-coffee-900">{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-coffee-200 pt-2 flex justify-between font-bold text-coffee-900">
            <span>TOTAL</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="text-xs text-coffee-400">
            Pago: {metodoPago}
          </div>
        </div>

        {/* Selección de impresoras */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Enviar a</p>
          <div className="grid grid-cols-3 gap-2">
            {DESTINO_CONFIG.map(({ id, label, icon }) => {
              const active = destinos.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleDestino(id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                    active
                      ? 'border-coffee-700 bg-coffee-700 text-cream'
                      : 'border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 text-coffee-600'
                  }`}
                >
                  {icon}
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de tamaño de papel (solo afecta al fallback navegador) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Tamaño papel</p>
          <div className="grid grid-cols-2 gap-2">
            {TAMAÑO_CONFIG.map(({ id, label }) => {
              const active = tamaño === id;
              return (
                <button
                  key={id}
                  onClick={() => setTamaño(id)}
                  className={`py-3 rounded-2xl border-2 transition-all text-xs font-semibold ${
                    active
                      ? 'border-coffee-700 bg-coffee-700 text-cream'
                      : 'border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 text-coffee-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botones */}
        <button
          onClick={handleBrowserPrint}
          className="w-full py-3 rounded-2xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir cuenta (navegador)
        </button>
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="w-full py-3 rounded-2xl border-2 border-coffee-200 text-coffee-700 text-sm font-bold hover:bg-coffee-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Enviando...' : 'Enviar a impresora térmica'}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
