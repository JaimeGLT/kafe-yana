import React from 'react';
import { Printer, X, MonitorCheck, UtensilsCrossed, GlassWater, Globe } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { escapeHtml, imprimirEnNavegador } from '../../utils/printBrowser';

type Tamaño = 'pequeño' | 'mediano';
type Destino = 'principal' | 'cocina' | 'barra';

// ── Tipos ────────────────────────────────────────────────────────────────

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

  razonSocialEmisor?: string | null;
  nitEmisor?: string | null;

  // Para Importe Base Crédito Fiscal (= subtotal cuando no hay descuento)
  subtotal?: number | null;
  descuentoAdicional?: number | null;

  leyenda?: string | null;
}

interface PrintFacturaModalProps {
  data: PrintFacturaData | null;
  onConfirm: (destinos: Destino[], anchoCaracteres?: number) => Promise<void> | void;
  onClose: () => void;
}

const ANCHO_CARACTERES: Record<Tamaño, number> = {
  pequeño: 32,
  mediano: 48,
};

const PREVIEW_WIDTH_PX: Record<Tamaño, number> = {
  pequeño: 224,
  mediano: 320,
};

const EMISOR_DEFAULTS = {
  razonSocial: 'CORNEJO ARZE VARGAS GRUPO DE INVERSIONES S.R.L.',
  nit: '696210027',
};

const DESTINO_CONFIG: { id: Destino; label: string; icon: React.ReactNode }[] = [
  { id: 'principal', label: 'Principal', icon: <MonitorCheck className="h-4 w-4" /> },
  { id: 'cocina',    label: 'Cocina',    icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: 'barra',     label: 'Barra',     icon: <GlassWater className="h-4 w-4" /> },
];

// ── Helpers (mínimo necesario) ──────────────────────────────────────────

function formatearFechaBolivia(fecha: Date | string | null | undefined): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(d).replace(',', '');
}

function buildQrUrl(data: PrintFacturaData): string | null {
  if (!data.numeroFactura || !data.cuf) return null;
  const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
  const f = formatearFechaBolivia(data.fechaEmision);
  const fecha = f !== '—' ? f.split(' ')[0]?.split('/').reverse().join('') ?? '' : '';
  return `https://siat.impuestos.gob.bo/consulta/QR?nit=${nit}&cuf=${encodeURIComponent(data.cuf)}&numero=${data.numeroFactura}&fecha=${fecha}`;
}

function partirTexto(texto: string, ancho: number): string[] {
  if (!texto) return [];
  const palabras = texto.trim().split(/\s+/);
  const lineas: string[] = [];
  let linea = '';
  for (const palabra of palabras) {
    if (palabra.length > ancho) {
      if (linea) { lineas.push(linea); linea = ''; }
      for (let i = 0; i < palabra.length; i += ancho)
        lineas.push(palabra.substring(i, i + ancho));
      continue;
    }
    if (linea && linea.length + palabra.length + 1 > ancho) {
      lineas.push(linea); linea = '';
    }
    linea = linea ? `${linea} ${palabra}` : palabra;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

// ── Sub-componentes de línea ─────────────────────────────────────────────

const Separator: React.FC<{ chars: number }> = ({ chars }) => (
  <div className="font-mono text-coffee-700" style={{ fontSize: '9px' }}>
    {new String('=').repeat(chars)}
  </div>
);

const Dash: React.FC<{ chars: number }> = ({ chars }) => (
  <div className="font-mono text-coffee-300" style={{ fontSize: '9px' }}>
    {new String('-').repeat(chars)}
  </div>
);

const Line: React.FC<{ children: React.ReactNode; bold?: boolean; size?: number; center?: boolean }> =
  ({ children, bold, size = 10, center }) => (
  <div
    className={`${center ? 'text-center' : ''} font-mono ${bold ? 'font-bold' : ''} text-coffee-900`}
    style={{ fontSize: `${size}px`, lineHeight: 1.2 }}
  >
    {children}
  </div>
);

// ── Preview del ticket (solo lo exigido por SIN) ─────────────────────────

interface FacturaPreviewProps {
  data: PrintFacturaData;
  tamaño: Tamaño;
  qrUrl: string | null;
}

const FacturaPreview: React.FC<FacturaPreviewProps> = ({ data, tamaño, qrUrl }) => {
  const widthPx = PREVIEW_WIDTH_PX[tamaño];
  const ancho = ANCHO_CARACTERES[tamaño];

  const razonSocial = data.razonSocialEmisor || EMISOR_DEFAULTS.razonSocial;
  const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
  const qrSize = tamaño === 'pequeño' ? 120 : 140;

  const descuentoTotal = data.descuentoAdicional ?? 0;
  const baseCreditoFiscal = data.subtotal ?? data.total;

  return (
    <div
      className="mx-auto bg-white border border-coffee-300 rounded-md shadow-sm text-coffee-900"
      style={{ width: `${widthPx}px`, padding: '10px 8px' }}
    >
      {/* Emisor */}
      <Line bold center size={11}>{razonSocial}</Line>
      <Line center size={9}>NIT: {nit}</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      {/* Tipo de documento */}
      <Line bold center size={12}>FACTURA</Line>
      <Line bold center size={9}>(Con Derecho a Crédito Fiscal)</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      {/* Cabecera factura */}
      <Line bold size={10}>FACTURA Nro.: {data.numeroFactura ?? '—'}</Line>
      <Line size={9}>Fecha: {formatearFechaBolivia(data.fechaEmision)}</Line>
      <Line size={9}>Nombre/Razón Social: {data.razonSocialCliente ?? '—'}</Line>
      <Line size={9}>NIT/CI/CEX: {data.nitCliente ?? '—'}</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      {/* Detalle */}
      {data.items.map((item, i) => (
        <div key={i} className="mb-1">
          {partirTexto(`${item.cantidad} x ${item.nombre}`, ancho - 2).map((l, j) => (
            <Line key={j} size={9}>  {l}</Line>
          ))}
          <div className="flex justify-between font-mono text-coffee-900" style={{ fontSize: '9px' }}>
            <span>  Bs/{item.precio.toFixed(2)} c/u</span>
            <span>Bs/{item.total.toFixed(2)}</span>
          </div>
          <Dash chars={ancho} />
        </div>
      ))}

      {/* Totales */}
      {descuentoTotal > 0 && (
        <Line bold size={10}><span className="flex justify-between"><span>SUBTOTAL:</span><span>Bs/{(data.subtotal ?? data.total).toFixed(2)}</span></span></Line>
      )}
      {descuentoTotal > 0 && (
        <Line size={9}><span className="flex justify-between"><span>DESCUENTO:</span><span>-Bs/{descuentoTotal.toFixed(2)}</span></span></Line>
      )}
      <Line bold size={11}><span className="flex justify-between"><span>TOTAL:</span><span>Bs/{data.total.toFixed(2)}</span></span></Line>
      <Line size={8}><span className="flex justify-between"><span>Importe Base Crédito Fiscal:</span><span>Bs/{baseCreditoFiscal.toFixed(2)}</span></span></Line>

      <div className="my-1"><Separator chars={ancho} /></div>

      {/* QR + Código de recepción (a la par para ahorrar espacio) */}
      {qrUrl && (
        <div className="flex flex-col items-center gap-1">
          <QRCodeSVG value={qrUrl} size={qrSize} level="M" />
          {data.codigoRecepcion && (
            <Line size={8} center>Cód. Recepción: {data.codigoRecepcion}</Line>
          )}
          <Line size={7} center>Consulta en siat.impuestos.gob.bo</Line>
        </div>
      )}

      <div className="my-1"><Separator chars={ancho} /></div>

      {/* CUF (al pie, cerca del QR — referencia cruzada de validación) */}
      {data.cuf && (
        <Line size={8}><span className="font-bold">CUF:</span> {data.cuf}</Line>
      )}

      {/* Leyenda del CUFD (viene del backend) */}
      {data.leyenda?.trim() && (
        <>
          <div className="my-1"><Separator chars={ancho} /></div>
          {partirTexto(data.leyenda, ancho).map((l, i) => (
            <Line key={i} size={8} center>{l}</Line>
          ))}
        </>
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

  const handleBrowserPrint = () => {
    const ancho = ANCHO_CARACTERES[tamaño];
    const razonSocial = data.razonSocialEmisor || EMISOR_DEFAULTS.razonSocial;
    const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
    const descuentoTotal = data.descuentoAdicional ?? 0;
    const baseCreditoFiscal = data.subtotal ?? data.total;
    const fechaStr = formatearFechaBolivia(data.fechaEmision);
    const qrUrlLocal = buildQrUrl(data);

    imprimirEnNavegador({
      titulo: `Factura N° ${data.numeroFactura ?? data.ventaId}`,
      anchoMM: tamaño === 'pequeño' ? '58' : '80',
      buildBody: () => {
        const sep = new String('=').repeat(ancho);
        const dash = new String('-').repeat(ancho);
        const line = (txt: string, bold = false, center = false) => {
          const safe = escapeHtml(txt);
          const style = `font-family: monospace; font-size: 10px; line-height: 1.25; color: #000; ${bold ? 'font-weight: bold;' : ''} ${center ? 'text-align: center;' : ''}`;
          return `<div style="${style}">${safe}</div>`;
        };
        const lines: string[] = [];
        lines.push(line(razonSocial, true, true));
        lines.push(line(`NIT: ${nit}`, false, true));
        lines.push(line(sep));
        lines.push(line('FACTURA', true, true));
        lines.push(line('(Con Derecho a Crédito Fiscal)', false, true));
        lines.push(line(sep));
        lines.push(line(`FACTURA Nro.: ${data.numeroFactura ?? '—'}`, true));
        lines.push(line(`Fecha: ${fechaStr}`));
        lines.push(line(`Nombre/Razón Social: ${data.razonSocialCliente ?? '—'}`));
        lines.push(line(`NIT/CI/CEX: ${data.nitCliente ?? '—'}`));
        lines.push(line(sep));
        for (const item of data.items) {
          for (const l of partirTexto(`${item.cantidad} x ${item.nombre}`, ancho - 2)) {
            lines.push(line(`  ${l}`));
          }
          lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
            <span>  Bs/${item.precio.toFixed(2)} c/u</span>
            <span>Bs/${item.total.toFixed(2)}</span>
          </div>`);
          lines.push(line(dash));
        }
        if (descuentoTotal > 0) {
          lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:10px;font-weight:bold;">
            <span>SUBTOTAL:</span><span>Bs/${(data.subtotal ?? data.total).toFixed(2)}</span>
          </div>`);
          lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
            <span>DESCUENTO:</span><span>-Bs/${descuentoTotal.toFixed(2)}</span>
          </div>`);
        }
        lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:11px;font-weight:bold;">
          <span>TOTAL:</span><span>Bs/${data.total.toFixed(2)}</span>
        </div>`);
        lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:8px;">
          <span>Importe Base Crédito Fiscal:</span><span>Bs/${baseCreditoFiscal.toFixed(2)}</span>
        </div>`);
        lines.push(line(sep));
        if (qrUrlLocal) {
          const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=1&data=${encodeURIComponent(qrUrlLocal)}`;
          lines.push(`<div style="text-align:center;margin:4px 0;">
            <img src="${qrImg}" alt="QR SIAT" style="width:120px;height:120px;" />
            ${data.codigoRecepcion ? `<div style="font-family:monospace;font-size:8px;text-align:center;">Cód. Recepción: ${escapeHtml(data.codigoRecepcion)}</div>` : ''}
            <div style="font-family:monospace;font-size:7px;text-align:center;">Consulta en siat.impuestos.gob.bo</div>
          </div>`);
        }
        lines.push(line(sep));
        if (data.cuf) {
          lines.push(line(`CUF: ${data.cuf}`));
        }
        if (data.leyenda?.trim()) {
          lines.push(line(sep));
          for (const l of partirTexto(data.leyenda, ancho)) {
            lines.push(line(l, false, true));
          }
        }
        return lines.join('');
      },
    });
  };

  const qrUrl = buildQrUrl(data);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">

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

        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Vista previa</p>
          <div className="bg-coffee-100 rounded-2xl p-4 max-h-[50vh] overflow-y-auto">
            <FacturaPreview data={data} tamaño={tamaño} qrUrl={qrUrl} />
          </div>
        </div>

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
