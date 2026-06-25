import React from 'react';
import { Printer, X, MonitorCheck, UtensilsCrossed, GlassWater } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../../utils';
import logoKafeYana from '../../assets/img/logo.svg';

type Tamaño = 'pequeño' | 'mediano';
type Destino = 'principal' | 'cocina' | 'barra';

export interface PrintFacturaItem {
  cantidad: number;
  nombre: string;
  precio: number;
  total: number;
}

export interface PrintFacturaData {
  ventaId: number;
  numeroFactura?: number | null;
  codigoRecepcion?: string | null;
  cuf?: string | null;
  nitCliente?: string | null;
  razonSocialCliente?: string | null;
  fechaEmision?: string | null;
  total: number;
  items: PrintFacturaItem[];

  // Datos del emisor (opcional, fallback a constantes si faltan)
  razonSocialEmisor?: string | null;
  direccionEmisor?: string | null;
  municipioEmisor?: string | null;
  telefonoEmisor?: string | null;
  nitEmisor?: string | null;
}

interface PrintFacturaModalProps {
  data: PrintFacturaData | null;
  /** Llamado al confirmar con la selección de destinos y ancho. */
  onConfirm: (destinos: Destino[], anchoCaracteres?: number) => Promise<void> | void;
  onClose: () => void;
}

const ANCHO_CARACTERES: Record<Tamaño, number> = {
  pequeño: 32, // 58mm@FontA
  mediano: 48, // 80mm@FontA — el default de la factura SIAT
};

// Ancho visual del preview (en px). Proporcional al ancho en caracteres
// para que la preview se parezca al ticket físico.
const PREVIEW_WIDTH_PX: Record<Tamaño, number> = {
  pequeño: 224, // 32 chars × ~7px
  mediano: 320, // 48 chars × ~6.7px
};

// Defaults del emisor — caer aquí si no vienen en props.
const EMISOR_DEFAULTS = {
  razonSocial: 'CORNEJO ARZE VARGAS GRUPO DE INVERSIONES S.R.L.',
  direccion: 'ZONA: NORESTE, CALLE: LANZA, NRO.: 949',
  municipio: 'Cochabamba',
  telefono: '77133378',
  nit: '696210027',
};

const DESTINO_CONFIG: { id: Destino; label: string; icon: React.ReactNode }[] = [
  { id: 'principal', label: 'Principal', icon: <MonitorCheck className="h-4 w-4" /> },
  { id: 'cocina',    label: 'Cocina',    icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'barra',     label: 'Barra',     icon: <GlassWater className="h-4 w-4" /> },
];

/** Construye la URL de consulta QR del SIAT. Devuelve null si faltan datos. */
function buildQrUrl(data: PrintFacturaData): string | null {
  if (!data.numeroFactura || !data.cuf) return null;
  const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
  let fecha = '';
  if (data.fechaEmision) {
    const d = new Date(data.fechaEmision);
    if (!Number.isNaN(d.getTime())) {
      fecha = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return `https://siat.impuestos.gob.bo/consulta/QR?nit=${nit}&cuf=${data.cuf}&numero=${data.numeroFactura}&fecha=${fecha}`;
}

// ── Sub-componente: preview del ticket ────────────────────────────────────

interface FacturaPreviewProps {
  data: PrintFacturaData;
  tamaño: Tamaño;
  qrUrl: string | null;
}

const FacturaPreview: React.FC<FacturaPreviewProps> = ({ data, tamaño, qrUrl }) => {
  const fechaTxt = data.fechaEmision
    ? new Date(data.fechaEmision).toLocaleString('es-BO', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const emisor = {
    razonSocial: data.razonSocialEmisor || EMISOR_DEFAULTS.razonSocial,
    direccion: data.direccionEmisor || EMISOR_DEFAULTS.direccion,
    municipio: data.municipioEmisor || EMISOR_DEFAULTS.municipio,
    telefono: data.telefonoEmisor || EMISOR_DEFAULTS.telefono,
  };

  const widthPx = PREVIEW_WIDTH_PX[tamaño];
  const isPequeño = tamaño === 'pequeño';

  // Tamaños escalonados según ancho del papel. Aseguramos legibilidad en 58mm.
  const wordmarkSize = isPequeño ? 18 : 22;
  const razonSocialSize = 8;
  const contactoSize = 8;
  const tipoDocSize = isPequeño ? 11 : 12;
  const labelSize = 10;
  const valueSize = 10;
  const totalSize = 13;
  const qrSize = 128; // >= 3cm a 96 DPI — mínimo para escaneo fiable

  return (
    <div
      className="mx-auto bg-white border border-coffee-300 rounded-md shadow-sm text-coffee-900"
      style={{
        width: `${widthPx}px`,
        padding: '14px 10px 12px 10px',
      }}
    >
      {/* ── Cabecera de marca ──────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center">
        <img
          src={logoKafeYana}
          alt="Kafe Yana"
          style={{
            width: `${isPequeño ? 44 : 56}px`,
            height: 'auto',
            marginBottom: '6px',
          }}
        />
        <div
          className="font-display font-extrabold tracking-[0.18em] text-coffee-900"
          style={{ fontSize: `${wordmarkSize}px`, lineHeight: 1 }}
        >
          KAFE YANA
        </div>
        <div
          className="italic text-coffee-500 mt-1"
          style={{ fontSize: `${razonSocialSize}px`, lineHeight: 1.2 }}
        >
          {emisor.razonSocial}
        </div>
        <div
          className="text-coffee-500 mt-1.5"
          style={{ fontSize: `${contactoSize}px`, lineHeight: 1.3 }}
        >
          {emisor.direccion}
          <br />
          {emisor.municipio} · Tel: {emisor.telefono}
        </div>
      </div>

      <div className="border-t border-dashed border-coffee-400 my-2.5" />

      {/* ── Tipo de documento ─────────────────────────────────────── */}
      <div className="text-center">
        <div
          className="font-bold text-coffee-900"
          style={{ fontSize: `${tipoDocSize}px`, letterSpacing: '0.1em' }}
        >
          FACTURA
        </div>
        <div
          className="text-coffee-600 mt-0.5"
          style={{ fontSize: '8px' }}
        >
          Con Derecho a Crédito Fiscal
        </div>
      </div>

      <div className="border-t border-dashed border-coffee-400 my-2" />

      {/* ── Datos de la factura ───────────────────────────────────── */}
      <div className="font-mono space-y-0.5">
        <div className="flex justify-between" style={{ fontSize: `${labelSize}px` }}>
          <span className="text-coffee-600">FACTURA N°:</span>
          <span className="font-bold">{data.numeroFactura ?? '—'}</span>
        </div>
        {data.cuf && (
          <div className="break-all" style={{ fontSize: '9px' }}>
            <span className="text-coffee-600">CUF: </span>
            <span className="font-bold">{data.cuf}</span>
          </div>
        )}
        {data.codigoRecepcion && (
          <div className="break-all" style={{ fontSize: '9px' }}>
            <span className="text-coffee-600">Cód. Recepción: </span>
            <span className="font-bold">{data.codigoRecepcion}</span>
          </div>
        )}
        <div style={{ fontSize: `${valueSize}px` }}>Fecha: {fechaTxt}</div>
        {data.razonSocialCliente && (
          <div style={{ fontSize: `${valueSize}px` }}>
            <span className="text-coffee-600">Cliente: </span>
            <span className="font-bold">{data.razonSocialCliente}</span>
          </div>
        )}
        {data.nitCliente && (
          <div style={{ fontSize: `${valueSize}px` }}>
            <span className="text-coffee-600">NIT/CI: </span>
            <span className="font-bold">{data.nitCliente}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-coffee-400 my-2" />

      {/* ── Items ─────────────────────────────────────────────────── */}
      <div className="font-mono">
        <div
          className="flex justify-between text-coffee-500 mb-0.5"
          style={{ fontSize: '9px' }}
        >
          <span>DESCRIPCIÓN</span>
          <span>SUBTOTAL</span>
        </div>
        <div className="border-b border-dashed border-coffee-300 mb-1" />
        <div className="space-y-1">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="flex justify-between gap-2"
              style={{ fontSize: `${valueSize}px` }}
            >
              <span className="truncate">
                <span className="font-bold">{item.cantidad}</span>× {item.nombre}
              </span>
              <span className="font-bold flex-shrink-0">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-dashed border-coffee-400 my-2" />

      {/* ── Total ─────────────────────────────────────────────────── */}
      <div
        className="flex justify-between font-mono font-bold text-coffee-900"
        style={{ fontSize: `${totalSize}px` }}
      >
        <span>TOTAL Bs:</span>
        <span>{formatCurrency(data.total)}</span>
      </div>

      <div className="border-t border-dashed border-coffee-400 my-3" />

      {/* ── QR (≥3cm) ─────────────────────────────────────────────── */}
      {qrUrl ? (
        <div className="flex flex-col items-center gap-1.5">
          <QRCodeSVG
            value={qrUrl}
            size={qrSize}
            level="M"
          />
          <div
            className="text-center text-coffee-500"
            style={{ fontSize: '7px' }}
          >
            Consulta en siat.impuestos.gob.bo
          </div>
        </div>
      ) : (
        <div
          className="text-center text-coffee-400 italic"
          style={{ fontSize: '9px' }}
        >
          QR no disponible (sin CUF/N°)
        </div>
      )}
    </div>
  );
};

// ── Modal principal ──────────────────────────────────────────────────────

export const PrintFacturaModal: React.FC<PrintFacturaModalProps> = ({ data, onConfirm, onClose }) => {
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');
  const [destinos, setDestinos] = React.useState<Destino[]>(['principal']);
  const [isPrinting, setIsPrinting] = React.useState(false);

  const toggleDestino = (d: Destino) =>
    setDestinos(prev =>
      prev.includes(d)
        ? prev.length > 1 ? prev.filter(x => x !== d) : prev
        : [...prev, d]
    );

  if (!data) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await onConfirm(destinos, ANCHO_CARACTERES[tamaño]);
      onClose();
    } finally {
      setIsPrinting(false);
    }
  };

  const qrUrl = buildQrUrl(data);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">Imprimir factura SIAT</p>
              <p className="text-xs text-coffee-400">
                {data.numeroFactura != null ? `N° ${data.numeroFactura}` : `Venta #${data.ventaId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview del ticket (lo que va a salir en la impresora) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Vista previa</p>
          <div className="bg-coffee-100 rounded-2xl p-4 max-h-[50vh] overflow-y-auto">
            <FacturaPreview data={data} tamaño={tamaño} qrUrl={qrUrl} />
          </div>
        </div>

        {/* Tamaño de papel */}
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

        {/* Destinos */}
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

        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="w-full py-3 rounded-2xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Enviando...' : 'Imprimir factura'}
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