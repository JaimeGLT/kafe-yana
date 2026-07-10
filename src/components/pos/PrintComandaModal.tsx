import React from 'react';
import { Printer, X, UtensilsCrossed, GlassWater, MonitorCheck, Globe } from 'lucide-react';
import { enviarPedido } from '../../utils/comandas';
import { escapeHtml, imprimirEnNavegador } from '../../utils/printBrowser';

type Tamaño = 'pequeño' | 'mediano';
type Destino = 'principal' | 'cocina' | 'barra';

interface ComandaItem {
  cantidad: number;
  nombre: string;
  nota: string;
  ubicacion: string;
  precio?: number;
}

export interface PrintComandaData {
  mesaName: string;
  roundNumber: number;
  rondaDesc: string;
  items: ComandaItem[];
}

interface PrintComandaModalProps {
  data: PrintComandaData | null;
  onClose: () => void;
}

const DESTINO_CONFIG: { id: Destino; label: string; icon: React.ReactNode }[] = [
  { id: 'principal', label: 'Principal', icon: <MonitorCheck className="h-4 w-4" /> },
  { id: 'cocina',    label: 'Cocina',    icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'barra',     label: 'Barra',     icon: <GlassWater className="h-4 w-4" /> },
];

function detectDefaultDestinos(items: ComandaItem[]): Destino[] {
  const ubicaciones = new Set(items.map((i) => i.ubicacion.toLowerCase()));
  const detected: Destino[] = [];
  if (ubicaciones.has('cocina')) detected.push('cocina');
  if (ubicaciones.has('barra'))  detected.push('barra');
  // Principal si hay items sin ubicacion especifica, o si no hay ningun otro destino
  const tieneItemsSinDestino = items.some((i) => !['cocina', 'barra'].includes(i.ubicacion.toLowerCase()));
  if (tieneItemsSinDestino || detected.length === 0) detected.push('principal');
  return detected;
}

export const PrintComandaModal: React.FC<PrintComandaModalProps> = ({ data, onClose }) => {
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [destinos, setDestinos] = React.useState<Destino[]>(() =>
    data ? detectDefaultDestinos(data.items) : ['principal']
  );

  React.useEffect(() => {
    if (data) setDestinos(detectDefaultDestinos(data.items));
  }, [data]);

  if (!data) return null;

  const toggleDestino = (d: Destino) => {
    setDestinos((prev) =>
      prev.includes(d)
        ? prev.length > 1 ? prev.filter((x) => x !== d) : prev
        : [...prev, d]
    );
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const ancho = tamaño === 'pequeño' ? 32 : 48;
      await enviarPedido(data.mesaName, data.rondaDesc, data.items, destinos, ancho);
    } finally {
      setIsPrinting(false);
      onClose();
    }
  };

  const handleBrowserPrint = () => {
    imprimirEnNavegador({
      titulo: `Comanda ${data.mesaName} - ${data.rondaDesc}`,
      anchoMM: tamaño === 'pequeño' ? '58' : '80',
      buildBody: () => {
        const rows = data.items.map(i => `
          <tr>
            <td style="padding:2px 0">
              ${escapeHtml(String(i.cantidad))}x ${escapeHtml(i.nombre)}
              ${i.nota ? `<span class="nota">📝 ${escapeHtml(i.nota)}</span>` : ''}
            </td>
          </tr>
        `).join('');
        return `
          <h2>Kafe Yana</h2>
          <p class="subtitle">COMANDA</p>
          <p class="subtitle">${escapeHtml(data.mesaName)} · ${escapeHtml(data.rondaDesc)}</p>
          <p class="subtitle">${new Date().toLocaleString('es-PE')}</p>
          <div class="divider"></div>
          <table>
            <tbody>${rows}</tbody>
          </table>
        `;
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-coffee-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">Imprimir comanda</p>
              <p className="text-xs text-coffee-400">{data.mesaName} · Ronda #{data.roundNumber}</p>
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
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tamaño */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Tamaño de papel</p>
          <div className="grid grid-cols-2 gap-2">
            {(['pequeño', 'mediano'] as Tamaño[]).map((t) => (
              <button
                key={t}
                onClick={() => setTamaño(t)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                  tamaño === t
                    ? 'border-coffee-800 bg-coffee-800 text-cream'
                    : 'border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 text-coffee-700'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span className="text-sm font-bold capitalize">{t === 'pequeño' ? 'Pequeña' : 'Mediana'}</span>
                <span className={`text-[10px] ${tamaño === t ? 'text-coffee-300' : 'text-coffee-400'}`}>
                  {t === 'pequeño' ? '58 mm' : '80 mm'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Destino */}
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

        {/* Actions */}
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="w-full py-3 rounded-2xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Enviando...' : 'Imprimir'}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50 transition-colors"
        >
          No imprimir
        </button>
      </div>
    </div>
  );
};
