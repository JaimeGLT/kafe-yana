import { toast } from '../components/ui';

export type AnchoPapel = '58' | '80';

export interface ImprimirNavegadorOpts {
  /** Título de la pestaña de la ventana emergente y del documento. */
  titulo: string;
  /** Ancho del papel: 58 mm (32 chars) o 80 mm (48 chars). */
  anchoMM: AnchoPapel;
  /**
   * Builder que devuelve el HTML del `<body>` del ticket.
   * El helper envuelve el contenido con `<html><head><style>@page ...</style></head>`.
   * Si necesitás escapar texto dinámico, usá `escapeHtml` provisto abajo.
   */
  buildBody: (anchoMM: AnchoPapel) => string;
}

/**
 * Escapa caracteres HTML inseguros. Útil para evitar XSS al inyectar
 * texto del usuario (nombres de productos, notas, etc.) en el template.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Abre una ventana nueva con un ticket 80mm/58mm formateado para `@page size`
 * y dispara `window.print()`. Cierra la ventana al terminar.
 *
 * Usado como fallback del envío a impresora térmica: si la térmica no responde,
 * el cajero puede imprimir el mismo contenido en cualquier impresora del SO.
 */
export function imprimirEnNavegador(opts: ImprimirNavegadorOpts): void {
  const previewWidth = opts.anchoMM === '58' ? 240 : 320;
  const win = window.open('', '_blank', `width=${previewWidth},height=600`);
  if (!win) {
    toast.error(
      'Popup bloqueado',
      'Permití ventanas emergentes para imprimir desde el navegador.',
    );
    return;
  }

  const body = opts.buildBody(opts.anchoMM);

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.titulo)}</title>
  <style>
    @page { size: ${opts.anchoMM}mm auto; margin: 0; }
    body { font-family: monospace; font-size: 13px; margin: 0; padding: 2mm; width: ${opts.anchoMM}mm; box-sizing: border-box; color: #000; }
    h2 { text-align: center; margin: 0 0 4px; font-size: 16px; }
    p.subtitle { text-align: center; margin: 2px 0; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 4px; font-size: 11px; }
    th:last-child, td:last-child { text-align: right; }
    td { vertical-align: top; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .total-row td { font-weight: bold; font-size: 15px; padding-top: 4px; }
    .nota { display: block; font-size: 10px; color: #555; font-style: italic; margin-left: 12px; }
    @media print { body { padding: 1mm; } }
  </style>
</head>
<body>${body}</body>
</html>`);

  win.document.close();
  win.focus();
  win.print();
  win.close();
}
