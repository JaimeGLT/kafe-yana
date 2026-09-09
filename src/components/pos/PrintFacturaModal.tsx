import React from 'react';
import { Printer, X, MonitorCheck, UtensilsCrossed, GlassWater, Globe } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { escapeHtml, imprimirEnNavegador } from '../../utils/printBrowser';
import { montoEnLetras } from '../../utils/montoEnLetras';
import logoUrl from '../../assets/img/logo.svg';
import { UNITS } from '../../data/units';

type Tamaño = 'pequeño' | 'mediano';
type Destino = 'principal' | 'cocina' | 'barra';

// ── Tipos ────────────────────────────────────────────────────────────────

export interface PrintFacturaItem {
  cantidad: number;
  nombre: string;
  precio: number;
  total: number;
  /** Código interno del producto (obligatorio en la rep. gráfica, RND 1021 Art. 69 h). */
  codigoProducto?: string | null;
  /** Unidad de medida ya resuelta a etiqueta (RND 1021 Art. 69 k). */
  unidad?: string | null;
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
  /** true si la venta se emitió fuera de línea / contingencia (Venta.TipoEmision === 2). */
  emitidaFueraDeLinea?: boolean | null;

  // ── Datos de sucursal / emisor (idénticos a los que imprime el ticket
  // térmico real, ver FacturaTicketBuilder.cs) ────────────────────────
  municipio?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  /** 0 = Casa Matriz, N = Sucursal N. */
  codigoSucursal?: number | null;
  codigoPuntoVenta?: number | null;
  codigoCliente?: string | null;
  complemento?: string | null;
  /** Etiqueta ya resuelta (ej. "EFECTIVO", "TARJETA + QR / TRANSFERENCIA"). */
  metodoPago?: string | null;
  /** 'Validada' | 'Observada' | 'Pendiente' | 'Anulada', tal como llega del backend. */
  estadoSiat?: string | null;
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

// Nombre comercial (marca) — se muestra destacado arriba de la razón social
// legal. El SIAT exige que la razón social registrada ante el SIN siga
// apareciendo en el documento (por eso se mantiene, más pequeña, debajo),
// pero no impide resaltar el nombre comercial con el que el cliente conoce
// al negocio.
const NOMBRE_COMERCIAL = 'KAFE YANA';

// Leyendas fijas obligatorias bajo la modalidad "Factura Computarizada En
// Línea". Deben coincidir EXACTAMENTE con las que imprime el ticket térmico
// real (ver FacturaTicketBuilder.cs) — ahí van sin tildes por la limitación
// del encoding ISO-8859-1 de la impresora; acá usamos ortografía correcta
// porque la preview/navegador no tiene esa restricción.
const LEYENDA_LEY_453 =
  'ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY';
// La leyenda de representación gráfica cambia según la venta se haya emitido
// en línea o fuera de línea / contingencia (RND 102100000011 Art. 69, incisos d y e).
const leyendaRepresentacionGrafica = (fueraDeLinea?: boolean | null) =>
  fueraDeLinea
    ? 'Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido fuera de línea, verifique su envío con su proveedor o en la página web www.impuestos.gob.bo'
    : 'Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido en una modalidad de facturación en línea';

// code (SIAT) → etiqueta legible de unidad de medida (catálogo local).
function etiquetaUnidad(codigo: string | null | undefined): string {
  if (!codigo) return '';
  const n = Number(codigo);
  return UNITS.find((u) => u.codigo === n)?.value ?? codigo;
}

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

function etiquetaSucursal(codigo: number | null | undefined): string {
  if (codigo == null) return '';
  return codigo === 0 ? 'SUCURSAL CASA MATRIZ' : `SUCURSAL N. ${codigo}`;
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

const Line: React.FC<{ children: React.ReactNode; bold?: boolean; size?: number; center?: boolean }> =
  ({ children, bold, size = 10, center }) => (
  <div
    className={`${center ? 'text-center' : ''} font-mono ${bold ? 'font-bold' : ''} text-coffee-900`}
    style={{ fontSize: `${size}px`, lineHeight: 1.2 }}
  >
    {children}
  </div>
);

const WrappedLine: React.FC<{ texto: string; ancho: number; size?: number; center?: boolean }> =
  ({ texto, ancho, size = 8, center }) => (
  <>
    {partirTexto(texto, ancho).map((l, i) => (
      <Line key={i} size={size} center={center}>{l}</Line>
    ))}
  </>
);

// ── Preview del ticket (mismos datos que imprime FacturaTicketBuilder.cs) ─

interface FacturaPreviewProps {
  data: PrintFacturaData;
  tamaño: Tamaño;
  qrUrl: string | null;
  qrRef?: React.Ref<SVGSVGElement>;
}

const FacturaPreview: React.FC<FacturaPreviewProps> = ({ data, tamaño, qrUrl, qrRef }) => {
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
      {/* Emisor: logo + nombre comercial destacado + razón social legal (más chica) */}
      <div className="flex justify-center mb-1">
        <img src={logoUrl} alt="" style={{ width: tamaño === 'pequeño' ? 56 : 68, height: 'auto' }} />
      </div>
      <Line bold center size={14}>{NOMBRE_COMERCIAL}</Line>
      <Line center size={8}>{razonSocial}</Line>
      {data.codigoSucursal != null && (
        <Line center size={9}>{etiquetaSucursal(data.codigoSucursal)}</Line>
      )}
      {data.codigoPuntoVenta != null && (
        <Line center size={9}>No. Punto de Venta {data.codigoPuntoVenta}</Line>
      )}
      {data.direccion && <WrappedLine texto={data.direccion} ancho={ancho} size={9} center />}
      {data.telefono && <Line center size={9}>Telefono: {data.telefono}</Line>}
      {data.municipio && <Line center size={9}>{data.municipio}</Line>}
      <div className="my-1"><Separator chars={ancho} /></div>
      <Line center size={9}>NIT: {nit}</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      {/* Tipo de documento */}
      <Line bold center size={12}>FACTURA</Line>
      <Line bold center size={9}>(Con Derecho a Crédito Fiscal)</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      {/* Cabecera factura */}
      <Line bold size={10}>FACTURA Nro.: {data.numeroFactura ?? '—'}</Line>
      {data.cuf && (
        <>
          <Line bold size={9}>COD. AUTORIZACION:</Line>
          <WrappedLine texto={data.cuf} ancho={ancho} size={8} />
        </>
      )}
      <Line size={9}>Fecha: {formatearFechaBolivia(data.fechaEmision)}</Line>
      <Line size={9}>Nombre/Razón Social: {data.razonSocialCliente ?? '—'}</Line>
      <Line size={9}>NIT/CI/CEX: {data.nitCliente ?? '—'}</Line>
      {data.complemento && <Line size={9}>Complemento: {data.complemento}</Line>}
      {data.codigoCliente && <Line size={9}>Cod. Cliente: {data.codigoCliente}</Line>}
      <div className="my-1"><Separator chars={ancho} /></div>

      {/* Detalle */}
      {data.items.map((item, i) => (
        <div key={i} className="mb-2 border-b border-dashed border-coffee-300 pb-1">
          {partirTexto(item.nombre, ancho).map((l, j) => (
            <Line key={j} size={9} bold>{l}</Line>
          ))}
          <div className="flex justify-between font-mono text-coffee-900" style={{ fontSize: '9px' }}>
            <span>  {item.cantidad} x Bs/{item.precio.toFixed(2)}</span>
            <span>Bs/{item.total.toFixed(2)}</span>
          </div>
          {(item.codigoProducto || item.unidad) && (
            <Line size={7}>
              {'  '}
              {item.codigoProducto ? `Cod: ${item.codigoProducto}` : ''}
              {item.codigoProducto && item.unidad ? '  ' : ''}
              {item.unidad ? `UM: ${etiquetaUnidad(item.unidad)}` : ''}
            </Line>
          )}
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

      <WrappedLine texto={`Son: ${montoEnLetras(data.total)}`} ancho={ancho} size={8} />

      {/* Leyenda del CUFD (viene del backend) */}
      {data.leyenda?.trim() && (
        <>
          <div className="my-1"><Separator chars={ancho} /></div>
          <WrappedLine texto={data.leyenda} ancho={ancho} size={8} center />
        </>
      )}

      {/* QR y luego las leyendas fijas obligatorias al pie */}
      <div className="my-1"><Separator chars={ancho} /></div>
      {qrUrl && (
        <div className="flex flex-col items-center gap-1">
          <QRCodeSVG ref={qrRef} value={qrUrl} size={qrSize} level="M" />
          <Line size={7} center>Consulta en siat.impuestos.gob.bo</Line>
        </div>
      )}

      <div className="my-1" />
      <WrappedLine texto={LEYENDA_LEY_453} ancho={ancho} size={7} center />
      <div className="my-1" />
      <WrappedLine texto={leyendaRepresentacionGrafica(data.emitidaFueraDeLinea)} ancho={ancho} size={7} center />

      {data.codigoRecepcion && (
        <Line size={8}>Cod. Recepcion SIAT: {data.codigoRecepcion}</Line>
      )}
    </div>
  );
};

// ── Modal principal ──────────────────────────────────────────────────────

export const PrintFacturaModal: React.FC<PrintFacturaModalProps> = ({ data, onConfirm, onClose }) => {
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');
  const [destinos, setDestinos] = React.useState<Destino[]>(['principal']);
  const [isPrinting, setIsPrinting] = React.useState(false);
  // SVG del QR ya renderizado localmente en la preview (qrcode.react, sin
  // depender de internet). Lo reusamos tal cual al imprimir por navegador en
  // vez de pedirle la imagen a un servicio externo (api.qrserver.com) — si
  // ese servicio no responde, el QR impreso queda en blanco. Ver bug reportado.
  const qrSvgRef = React.useRef<SVGSVGElement>(null);

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
        const line = (txt: string, bold = false, center = false, size = 10) => {
          const safe = escapeHtml(txt);
          const style = `font-family: monospace; font-size: ${size}px; line-height: 1.25; color: #000; ${bold ? 'font-weight: bold;' : ''} ${center ? 'text-align: center;' : ''}`;
          return `<div style="${style}">${safe}</div>`;
        };
        const wrapped = (txt: string, size = 8, center = false) =>
          partirTexto(txt, ancho).map((l) => {
            const safe = escapeHtml(l);
            return `<div style="font-family: monospace; font-size: ${size}px; line-height: 1.25; color: #000; ${center ? 'text-align: center;' : ''}">${safe}</div>`;
          }).join('');

        const lines: string[] = [];
        lines.push(`<div style="text-align:center;margin:0 0 4px;"><img src="${logoUrl}" alt="" style="width:64px;height:auto;" /></div>`);
        lines.push(line(NOMBRE_COMERCIAL, true, true, 14));
        lines.push(line(razonSocial, false, true, 8));
        if (data.codigoSucursal != null) lines.push(line(etiquetaSucursal(data.codigoSucursal), false, true));
        if (data.codigoPuntoVenta != null) lines.push(line(`No. Punto de Venta ${data.codigoPuntoVenta}`, false, true));
        if (data.direccion) lines.push(wrapped(data.direccion, 9, true));
        if (data.telefono) lines.push(line(`Telefono: ${data.telefono}`, false, true));
        if (data.municipio) lines.push(line(data.municipio, false, true));
        lines.push(line(sep));
        lines.push(line(`NIT: ${nit}`, false, true));
        lines.push(line(sep));
        lines.push(line('FACTURA', true, true));
        lines.push(line('(Con Derecho a Crédito Fiscal)', false, true));
        lines.push(line(sep));
        lines.push(line(`FACTURA Nro.: ${data.numeroFactura ?? '—'}`, true));
        if (data.cuf) {
          lines.push(line('COD. AUTORIZACION:', true));
          lines.push(wrapped(data.cuf, 9));
        }
        lines.push(line(`Fecha: ${fechaStr}`));
        lines.push(line(`Nombre/Razón Social: ${data.razonSocialCliente ?? '—'}`));
        lines.push(line(`NIT/CI/CEX: ${data.nitCliente ?? '—'}`));
        if (data.complemento) lines.push(line(`Complemento: ${data.complemento}`));
        if (data.codigoCliente) lines.push(line(`Cod. Cliente: ${data.codigoCliente}`));
        lines.push(line(sep));
        for (const item of data.items) {
          for (const l of partirTexto(item.nombre, ancho)) {
            lines.push(line(l, true));
          }
          lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
            <span>${escapeHtml(`  ${item.cantidad} x Bs/${item.precio.toFixed(2)}`)}</span>
            <span>Bs/${item.total.toFixed(2)}</span>
          </div>`);
          const meta = [
            item.codigoProducto ? `Cod: ${item.codigoProducto}` : '',
            item.unidad ? `UM: ${etiquetaUnidad(item.unidad)}` : '',
          ].filter(Boolean).join('  ');
          if (meta) lines.push(line(`  ${meta}`, false, false, 7));
          lines.push(`<div style="border-bottom:1px dashed #999;margin:2px 0;"></div>`);
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
        lines.push(wrapped(`Son: ${montoEnLetras(data.total)}`, 8));
        if (data.leyenda?.trim()) {
          lines.push(line(sep));
          lines.push(wrapped(data.leyenda, 8, true));
        }
        lines.push(line(sep));
        if (qrUrlLocal) {
          // SVG generado localmente (mismo que ve la preview), embebido tal
          // cual. Nunca depende de un servicio externo, así que no puede
          // quedar en blanco por falta de internet.
          let qrSvgMarkup = qrSvgRef.current?.outerHTML;
          // Al reinsertar el SVG en la ventana nueva, Chrome solo lo pinta si
          // lleva el namespace SVG explícito.
          if (qrSvgMarkup && !qrSvgMarkup.includes('xmlns')) {
            qrSvgMarkup = qrSvgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          const qrHtml = qrSvgMarkup
            ? `<div style="width:120px;height:120px;margin:0 auto;">${qrSvgMarkup}</div>`
            : '';
          lines.push(`<div style="text-align:center;margin:4px 0;">
            ${qrHtml}
            <div style="font-family:monospace;font-size:7px;text-align:center;">Consulta en siat.impuestos.gob.bo</div>
          </div>`);
        }
        // Leyendas obligatorias al pie, debajo del QR (centradas).
        lines.push(wrapped(LEYENDA_LEY_453, 7, true));
        lines.push(wrapped(leyendaRepresentacionGrafica(data.emitidaFueraDeLinea), 7, true));
        if (data.codigoRecepcion) lines.push(line(`Cod. Recepcion SIAT: ${data.codigoRecepcion}`));
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
            <FacturaPreview data={data} tamaño={tamaño} qrUrl={qrUrl} qrRef={qrSvgRef} />
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
