import React from 'react';
import { Printer, X, MonitorCheck, UtensilsCrossed, GlassWater, Globe } from 'lucide-react';
import { enviarCuenta } from '../../utils/comandas';
import { formatCurrency } from '../../utils';
import { escapeHtml, imprimirEnNavegador } from '../../utils/printBrowser';

export interface PreCuentaItem {
  nombre: string;
  cantidad: number;
  precioFinal: number;
  ubicacion?: string;
}

export interface PreCuentaData {
  mesaName: string;
  items: PreCuentaItem[];
}

interface PreCuentaModalProps {
  data: PreCuentaData | null;
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

export const PreCuentaModal: React.FC<PreCuentaModalProps> = ({ data, onClose }) => {
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [destinos, setDestinos] = React.useState<Destino[]>(['principal']);
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');

  React.useEffect(() => {
    if (!data) return;
    const set = new Set<Destino>(['principal']);
    for (const item of data.items) {
      if (item.ubicacion === 'cocina' || item.ubicacion === 'barra') {
        set.add(item.ubicacion as Destino);
      }
    }
    setDestinos([...set]);
  }, [data]);

  if (!data) return null;

  const total = data.items.reduce((s, i) => s + i.precioFinal * i.cantidad, 0);

  const toggleDestino = (d: Destino) =>
    setDestinos(prev =>
      prev.includes(d)
        ? prev.length > 1 ? prev.filter(x => x !== d) : prev
        : [...prev, d]
    );

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await enviarCuenta(
        data.mesaName,
        data.mesaName,
        data.items.map(i => ({
          cantidad: i.cantidad,
          nombre: i.nombre,
          precio: i.precioFinal,
          total: i.precioFinal * i.cantidad,
          ubicacion: i.ubicacion,
        })),
        total,
        '',
        destinos,
      );
    } finally {
      setIsPrinting(false);
      onClose();
    }
  };

  const handleBrowserPrint = () => {
    const anchoMM: '58' | '80' = tamaño === 'pequeño' ? '58' : '80';

    imprimirEnNavegador({
      titulo: `Pre-cuenta ${data.mesaName}`,
      anchoMM,
      buildBody: () => {
        const rows = data.items.map(i => `
          <tr>
            <td style="padding:2px 0">${escapeHtml(String(i.cantidad))}x ${escapeHtml(i.nombre)}</td>
            <td style="text-align:right;padding:2px 0">${formatCurrency(i.precioFinal)}</td>
            <td style="text-align:right;padding:2px 0">${formatCurrency(i.precioFinal * i.cantidad)}</td>
          </tr>
        `).join('');

        return `
          <h2>Kafe Yana</h2>
          <p class="subtitle">PRE-CUENTA</p>
          <p class="subtitle">${escapeHtml(data.mesaName)}</p>
          <p class="subtitle">${new Date().toLocaleString('es-PE')}</p>
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
                <td>${formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
          <div class="divider"></div>
          <p class="subtitle" style="margin-top:8px;font-style:italic">* Precio sujeto a cambio antes del cobro</p>
        `;
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-coffee-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">Pre-cuenta</p>
              <p className="text-xs text-coffee-400">{data.mesaName} · {data.items.length} productos</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBrowserPrint}
              title="Imprimir por navegador"
              className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200"
            >
              <Globe className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-coffee-50 rounded-2xl p-4 space-y-2 max-h-56 overflow-y-auto">
          {data.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-coffee-700">{item.cantidad}x {item.nombre}</span>
              <div className="text-right">
                <span className="text-coffee-400 text-xs mr-2">{formatCurrency(item.precioFinal)} c/u</span>
                <span className="font-semibold text-coffee-900">{formatCurrency(item.precioFinal * item.cantidad)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-coffee-200 pt-2 flex justify-between font-bold text-coffee-900">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

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

        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="w-full py-3 rounded-2xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Enviando...' : 'Enviar a impresora térmica'}
        </button>
        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
};
