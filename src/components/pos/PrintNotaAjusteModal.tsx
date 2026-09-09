import React from 'react';
import { Printer, X, Globe } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { escapeHtml, imprimirEnNavegador } from '../../utils/printBrowser';
import { montoEnLetras } from '../../utils/montoEnLetras';

type Tamaño = 'pequeño' | 'mediano';

// ── Tipos ────────────────────────────────────────────────────────────────

export interface PrintNotaAjusteItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subTotal: number;
}

export interface PrintNotaAjusteData {
  notaId: number;
  numeroNotaCreditoDebito: number;
  cuf?: string | null;
  codigoRecepcion?: string | null;
  estadoSiat?: string | null;
  fechaEmision?: string | null;
  leyenda?: string | null;

  // Emisor / sucursal (idéntico al de la factura original)
  razonSocialEmisor?: string | null;
  nitEmisor?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  codigoSucursal?: number | null;
  codigoPuntoVenta?: number | null;
  codigoCliente?: string | null;

  // Cliente
  nombreRazonSocial?: string | null;
  numeroDocumento?: string | null;
  complemento?: string | null;

  // Referencia a la factura original
  numeroFacturaOriginal?: number | null;
  numeroAutorizacionCuf?: string | null;
  fechaEmisionFactura?: string | null;

  // Montos
  montoTotalOriginal: number;
  montoTotalDevuelto: number;
  montoDescuentoCreditoDebito?: number | null;
  montoEfectivoCreditoDebito: number;

  items: PrintNotaAjusteItem[];
}

interface PrintNotaAjusteModalProps {
  data: PrintNotaAjusteData | null;
  onClose: () => void;
}

const ANCHO_CARACTERES: Record<Tamaño, number> = { pequeño: 32, mediano: 48 };
const PREVIEW_WIDTH_PX: Record<Tamaño, number> = { pequeño: 224, mediano: 320 };

const EMISOR_DEFAULTS = {
  razonSocial: 'CORNEJO ARZE VARGAS GRUPO DE INVERSIONES S.R.L.',
  nit: '696210027',
};

// Nombre comercial (marca) — ver PrintFacturaModal.tsx para el detalle de
// por qué se muestra destacado sobre la razón social legal.
const NOMBRE_COMERCIAL = 'KAFE YANA';

// Mismas leyendas fijas obligatorias que la factura (ver PrintFacturaModal.tsx
// y FacturaTicketBuilder.cs) — aplican también a la representación gráfica de
// notas de crédito/débito computarizadas emitidas en línea.
const LEYENDA_LEY_453 =
  'ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY';
const LEYENDA_REPRESENTACION_GRAFICA =
  'Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido en una modalidad de facturación en línea';

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

function buildQrUrl(data: PrintNotaAjusteData): string | null {
  if (!data.numeroNotaCreditoDebito || !data.cuf) return null;
  const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
  const f = formatearFechaBolivia(data.fechaEmision);
  const fecha = f !== '—' ? f.split(' ')[0]?.split('/').reverse().join('') ?? '' : '';
  return `https://siat.impuestos.gob.bo/consulta/QR?nit=${nit}&cuf=${encodeURIComponent(data.cuf)}&numero=${data.numeroNotaCreditoDebito}&fecha=${fecha}`;
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

// ── Preview ────────────────────────────────────────────────────────────

const NotaAjustePreview: React.FC<{ data: PrintNotaAjusteData; tamaño: Tamaño; qrUrl: string | null; qrRef?: React.Ref<SVGSVGElement> }> =
  ({ data, tamaño, qrUrl, qrRef }) => {
  const widthPx = PREVIEW_WIDTH_PX[tamaño];
  const ancho = ANCHO_CARACTERES[tamaño];
  const razonSocial = data.razonSocialEmisor || EMISOR_DEFAULTS.razonSocial;
  const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
  const qrSize = tamaño === 'pequeño' ? 120 : 140;

  // Solo mostramos las líneas de "Devolución" (trans=1); el trans=2
  // complementario que genera el backend es contable, no de cara al cliente.
  const itemsVisibles = data.items;

  return (
    <div
      className="mx-auto bg-white border border-coffee-300 rounded-md shadow-sm text-coffee-900"
      style={{ width: `${widthPx}px`, padding: '10px 8px' }}
    >
      <Line bold center size={14}>{NOMBRE_COMERCIAL}</Line>
      <Line center size={8}>{razonSocial}</Line>
      {data.codigoSucursal != null && <Line center size={9}>{etiquetaSucursal(data.codigoSucursal)}</Line>}
      {data.codigoPuntoVenta != null && <Line center size={9}>No. Punto de Venta {data.codigoPuntoVenta}</Line>}
      {data.direccion && <WrappedLine texto={data.direccion} ancho={ancho} size={9} center />}
      {data.telefono && <Line center size={9}>Telefono: {data.telefono}</Line>}
      {data.municipio && <Line center size={9}>{data.municipio}</Line>}
      <div className="my-1"><Separator chars={ancho} /></div>
      <Line center size={9}>NIT: {nit}</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      <Line bold center size={12}>NOTA DE CRÉDITO-DÉBITO</Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      <Line bold size={10}>Nota Nro.: {data.numeroNotaCreditoDebito}</Line>
      {data.cuf && (
        <>
          <Line bold size={9}>COD. AUTORIZACION:</Line>
          <WrappedLine texto={data.cuf} ancho={ancho} size={8} />
        </>
      )}
      <Line size={9}>Fecha: {formatearFechaBolivia(data.fechaEmision)}</Line>
      <Line size={9}>Nombre/Razón Social: {data.nombreRazonSocial ?? '—'}</Line>
      <Line size={9}>NIT/CI/CEX: {data.numeroDocumento ?? '—'}</Line>
      {data.complemento && <Line size={9}>Complemento: {data.complemento}</Line>}
      {data.codigoCliente && <Line size={9}>Cod. Cliente: {data.codigoCliente}</Line>}
      <div className="my-1"><Separator chars={ancho} /></div>

      <Line size={9}>Factura Original Nro.: {data.numeroFacturaOriginal ?? '—'}</Line>
      <Line size={9}>Fecha Factura Original: {formatearFechaBolivia(data.fechaEmisionFactura)}</Line>
      {data.numeroAutorizacionCuf && (
        <>
          <Line size={9}>CUF Factura Original:</Line>
          <WrappedLine texto={data.numeroAutorizacionCuf} ancho={ancho} size={8} />
        </>
      )}
      <div className="my-1"><Separator chars={ancho} /></div>

      {itemsVisibles.map((item, i) => (
        <div key={i} className="mb-1">
          {partirTexto(`${item.cantidad} x ${item.descripcion}`, ancho - 2).map((l, j) => (
            <Line key={j} size={9}>  {l}</Line>
          ))}
          <div className="flex justify-between font-mono text-coffee-900" style={{ fontSize: '9px' }}>
            <span>  Bs/{item.precioUnitario.toFixed(2)} c/u</span>
            <span>Bs/{item.subTotal.toFixed(2)}</span>
          </div>
        </div>
      ))}

      <Line size={9}><span className="flex justify-between"><span>MONTO TOTAL ORIGINAL:</span><span>Bs/{data.montoTotalOriginal.toFixed(2)}</span></span></Line>
      <Line size={9}><span className="flex justify-between"><span>MONTO DEVUELTO:</span><span>Bs/{data.montoTotalDevuelto.toFixed(2)}</span></span></Line>
      {(data.montoDescuentoCreditoDebito ?? 0) > 0 && (
        <Line size={9}><span className="flex justify-between"><span>DESCUENTO:</span><span>Bs/{(data.montoDescuentoCreditoDebito ?? 0).toFixed(2)}</span></span></Line>
      )}
      <Line bold size={11}><span className="flex justify-between"><span>MONTO EFECTIVO:</span><span>Bs/{data.montoEfectivoCreditoDebito.toFixed(2)}</span></span></Line>
      <div className="my-1"><Separator chars={ancho} /></div>

      <WrappedLine texto={`Son: ${montoEnLetras(data.montoEfectivoCreditoDebito)}`} ancho={ancho} size={8} />

      <div className="my-1"><Separator chars={ancho} /></div>
      {data.leyenda?.trim() && <WrappedLine texto={data.leyenda} ancho={ancho} size={8} center />}
      <div className="my-1" />
      <WrappedLine texto={LEYENDA_LEY_453} ancho={ancho} size={7} />
      <div className="my-1" />
      <WrappedLine texto={LEYENDA_REPRESENTACION_GRAFICA} ancho={ancho} size={7} />

      {data.codigoRecepcion && <Line size={8}>Cod. Recepcion SIAT: {data.codigoRecepcion}</Line>}
      {data.estadoSiat && <Line size={8}>Estado SIAT: {data.estadoSiat}</Line>}

      <div className="my-1"><Separator chars={ancho} /></div>
      {qrUrl && (
        <div className="flex flex-col items-center gap-1">
          <QRCodeSVG ref={qrRef} value={qrUrl} size={qrSize} level="M" />
          <Line size={7} center>Consulta en siat.impuestos.gob.bo</Line>
        </div>
      )}
    </div>
  );
};

// ── Modal principal ──────────────────────────────────────────────────────

export const PrintNotaAjusteModal: React.FC<PrintNotaAjusteModalProps> = ({ data, onClose }) => {
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');
  // SVG del QR renderizado localmente en la preview (qrcode.react, sin
  // depender de internet). Se reusa al imprimir por navegador en vez de
  // pedirle la imagen a un servicio externo (api.qrserver.com).
  const qrSvgRef = React.useRef<SVGSVGElement>(null);

  if (!data) return null;

  const handleBrowserPrint = () => {
    const ancho = ANCHO_CARACTERES[tamaño];
    const razonSocial = data.razonSocialEmisor || EMISOR_DEFAULTS.razonSocial;
    const nit = data.nitEmisor || EMISOR_DEFAULTS.nit;
    const fechaStr = formatearFechaBolivia(data.fechaEmision);
    const qrUrlLocal = buildQrUrl(data);

    imprimirEnNavegador({
      titulo: `Nota N° ${data.numeroNotaCreditoDebito}`,
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
        lines.push(line('NOTA DE CRÉDITO-DÉBITO', true, true));
        lines.push(line(sep));
        lines.push(line(`Nota Nro.: ${data.numeroNotaCreditoDebito}`, true));
        if (data.cuf) {
          lines.push(line('COD. AUTORIZACION:', true));
          lines.push(wrapped(data.cuf, 9));
        }
        lines.push(line(`Fecha: ${fechaStr}`));
        lines.push(line(`Nombre/Razón Social: ${data.nombreRazonSocial ?? '—'}`));
        lines.push(line(`NIT/CI/CEX: ${data.numeroDocumento ?? '—'}`));
        if (data.complemento) lines.push(line(`Complemento: ${data.complemento}`));
        if (data.codigoCliente) lines.push(line(`Cod. Cliente: ${data.codigoCliente}`));
        lines.push(line(sep));
        lines.push(line(`Factura Original Nro.: ${data.numeroFacturaOriginal ?? '—'}`));
        lines.push(line(`Fecha Factura Original: ${formatearFechaBolivia(data.fechaEmisionFactura)}`));
        if (data.numeroAutorizacionCuf) {
          lines.push(line('CUF Factura Original:'));
          lines.push(wrapped(data.numeroAutorizacionCuf, 9));
        }
        lines.push(line(sep));
        for (const item of data.items) {
          for (const l of partirTexto(`${item.cantidad} x ${item.descripcion}`, ancho - 2)) {
            lines.push(line(`  ${l}`));
          }
          lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
            <span>  Bs/${item.precioUnitario.toFixed(2)} c/u</span>
            <span>Bs/${item.subTotal.toFixed(2)}</span>
          </div>`);
        }
        lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
          <span>MONTO TOTAL ORIGINAL:</span><span>Bs/${data.montoTotalOriginal.toFixed(2)}</span>
        </div>`);
        lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
          <span>MONTO DEVUELTO:</span><span>Bs/${data.montoTotalDevuelto.toFixed(2)}</span>
        </div>`);
        if ((data.montoDescuentoCreditoDebito ?? 0) > 0) {
          lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;">
            <span>DESCUENTO:</span><span>Bs/${(data.montoDescuentoCreditoDebito ?? 0).toFixed(2)}</span>
          </div>`);
        }
        lines.push(`<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:11px;font-weight:bold;">
          <span>MONTO EFECTIVO:</span><span>Bs/${data.montoEfectivoCreditoDebito.toFixed(2)}</span>
        </div>`);
        lines.push(line(sep));
        lines.push(wrapped(`Son: ${montoEnLetras(data.montoEfectivoCreditoDebito)}`, 8));
        lines.push(line(sep));
        if (data.leyenda?.trim()) lines.push(wrapped(data.leyenda, 8, true));
        lines.push(wrapped(LEYENDA_LEY_453, 7));
        lines.push(wrapped(LEYENDA_REPRESENTACION_GRAFICA, 7));
        if (data.codigoRecepcion) lines.push(line(`Cod. Recepcion SIAT: ${data.codigoRecepcion}`));
        if (data.estadoSiat) lines.push(line(`Estado SIAT: ${data.estadoSiat}`));
        lines.push(line(sep));
        if (qrUrlLocal) {
          // SVG generado localmente (mismo que ve la preview), embebido tal
          // cual — nunca depende de un servicio externo.
          const qrSvgMarkup = qrSvgRef.current?.outerHTML;
          const qrHtml = qrSvgMarkup
            ? `<div style="width:120px;height:120px;margin:0 auto;">${qrSvgMarkup}</div>`
            : '';
          lines.push(`<div style="text-align:center;margin:4px 0;">
            ${qrHtml}
            <div style="font-family:monospace;font-size:7px;text-align:center;">Consulta en siat.impuestos.gob.bo</div>
          </div>`);
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
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">Imprimir Nota de Ajuste SIAT</p>
              <p className="text-xs text-coffee-400">N° {data.numeroNotaCreditoDebito}</p>
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
            <NotaAjustePreview data={data} tamaño={tamaño} qrUrl={qrUrl} qrRef={qrSvgRef} />
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

        <button
          onClick={handleBrowserPrint}
          className="w-full py-3 rounded-2xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir nota
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
