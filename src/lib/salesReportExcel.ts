import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VentaNode, VentaReportStats, VentaPaymentData, VentaTopProduct } from '../types/ventas';

interface SalesReportExcelOptions {
  dateFrom: string;
  dateTo: string;
  stats: VentaReportStats;
  ventas: VentaNode[];
  paymentMethodData: VentaPaymentData[];
  allProducts: VentaTopProduct[];
}

const HEADER_FILL = 'FF8B4513';
const MONEY_FMT = '#,##0.00';

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : parseFloat(value) || 0;
}

/** Genera y descarga un .xlsx con resumen, mensual, diario, ventas, ítems y productos. */
export async function downloadSalesReportExcel(opts: SalesReportExcelOptions): Promise<void> {
  const { dateFrom, dateTo, stats, ventas, paymentMethodData, allProducts } = opts;
  // Carga diferida: exceljs es pesado y solo se usa al exportar.
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  wb.creator = 'Kafe Yana';
  wb.created = new Date();

  const periodo = `${format(new Date(dateFrom + 'T00:00:00'), 'dd/MM/yyyy')} al ${format(new Date(dateTo + 'T00:00:00'), 'dd/MM/yyyy')}`;
  const generado = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  const thin = { style: 'thin' as const, color: { argb: 'FFE8D5C4' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  interface Col { header: string; width: number; fmt?: string; align?: 'left' | 'right' | 'center' }

  /** Hoja con banner de título, subtítulo, encabezado de color, filas cebra y total opcional. */
  const makeSheet = (
    name: string, tab: string, accent: string, title: string,
    cols: Col[], rows: (string | number)[][], total?: (string | number)[],
  ) => {
    const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tab } } });
    const last = cols.length;
    cols.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));
    ws.mergeCells(1, 1, 1, last);
    const t = ws.getCell(1, 1);
    t.value = `Kafe Yana — ${title}`;
    t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    t.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 30;
    ws.mergeCells(2, 1, 2, last);
    const st = ws.getCell(2, 1);
    st.value = `Período: ${periodo}   ·   Generado: ${generado}`;
    st.font = { italic: true, size: 10, color: { argb: 'FF6B4F3B' } };
    st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    st.alignment = { indent: 1 };
    const h = ws.getRow(4);
    cols.forEach((c, i) => {
      const cell = h.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
      cell.alignment = { horizontal: c.align ?? 'center', vertical: 'middle' };
      cell.border = border;
    });
    h.height = 22;
    const paint = (vals: (string | number)[], idx: number, isTotal = false) => {
      const row = ws.getRow(idx);
      vals.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.border = border;
        if (cols[i].fmt) cell.numFmt = cols[i].fmt!;
        if (cols[i].align) cell.alignment = { horizontal: cols[i].align };
        if (isTotal) {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        } else if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBF5' } };
        }
      });
    };
    rows.forEach((r, i) => paint(r, 5 + i));
    if (total) paint(total, 5 + rows.length, true);
    ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
    if (rows.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: last } };
    return ws;
  };

  const money = (header: string, width = 16): Col => ({ header, width, fmt: MONEY_FMT, align: 'right' });

  // ── Resumen ─────────────────────────────────────────────────────────────
  const resumen = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: 'FF8B4513' } } });
  resumen.getColumn(1).width = 30;
  resumen.getColumn(2).width = 22;
  resumen.mergeCells('A1:B1');
  Object.assign(resumen.getCell('A1'), {
    value: 'Kafe Yana — Reporte de Ventas',
    font: { bold: true, size: 18, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { vertical: 'middle', indent: 1 },
  });
  resumen.getRow(1).height = 34;
  resumen.mergeCells('A2:B2');
  Object.assign(resumen.getCell('A2'), {
    value: `Período: ${periodo}   ·   Generado: ${generado}`,
    font: { italic: true, size: 10, color: { argb: 'FF6B4F3B' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } },
    alignment: { indent: 1 },
  });

  const section = (row: number, text: string, color: string) => {
    resumen.mergeCells(row, 1, row, 2);
    Object.assign(resumen.getCell(row, 1), {
      value: text,
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
      alignment: { indent: 1, vertical: 'middle' },
    });
    resumen.getRow(row).height = 22;
  };
  const kv = (row: number, label: string, value: number, fmt: string | undefined, labelFill: string, valueColor: string) => {
    const l = resumen.getCell(row, 1);
    l.value = label;
    l.font = { bold: true, color: { argb: 'FF3C2A1E' } };
    l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: labelFill } };
    l.border = border;
    const v = resumen.getCell(row, 2);
    v.value = value;
    v.font = { bold: true, size: 12, color: { argb: valueColor } };
    v.alignment = { horizontal: 'right' };
    if (fmt) v.numFmt = fmt;
    v.border = border;
  };

  section(4, 'Indicadores del período', 'FF2E7D32');
  kv(5, 'Total de ventas', stats.totalSalesCount, '#,##0', 'FFE8F5E9', 'FF2E7D32');
  kv(6, 'Ingresos totales (Bs)', stats.totalRevenue, MONEY_FMT, 'FFE8F5E9', 'FF2E7D32');
  kv(7, 'Ticket promedio (Bs)', stats.avgTicket, MONEY_FMT, 'FFE8F5E9', 'FF2E7D32');
  kv(8, 'Unidades vendidas', stats.unitsSold, '#,##0', 'FFE8F5E9', 'FF2E7D32');

  section(10, 'Ingresos por método de pago', 'FF1565C0');
  paymentMethodData.forEach((p, i) => kv(11 + i, p.metodo, p.total, MONEY_FMT, 'FFE3F2FD', 'FF1565C0'));
  resumen.views = [{ showGridLines: false }];

  // ── Agregados mensual / diario ──────────────────────────────────────────
  const porMes = new Map<string, { ventas: number; ingresos: number; unidades: number }>();
  const porDia = new Map<string, { ventas: number; ingresos: number; unidades: number }>();
  ventas.forEach((v) => {
    const fecha = new Date(v.fechaEmision);
    const unidades = (v.detalles ?? []).reduce((s, d) => s + d.cantidad, 0);
    const bump = (m: typeof porMes, k: string) => {
      const cur = m.get(k) ?? { ventas: 0, ingresos: 0, unidades: 0 };
      cur.ventas += 1;
      cur.ingresos += num(v.montoTotal);
      cur.unidades += unidades;
      m.set(k, cur);
    };
    bump(porMes, format(fecha, 'yyyy-MM'));
    bump(porDia, format(fecha, 'yyyy-MM-dd'));
  });

  const aggRows = (data: typeof porMes, labelFn: (k: string) => string) =>
    [...data.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([k, d]) => [labelFn(k), d.ventas, d.ingresos, d.ventas ? d.ingresos / d.ventas : 0, d.unidades]);
  const aggCols = (label: string): Col[] => [
    { header: label, width: 22, align: 'left' },
    { header: 'N° ventas', width: 12, align: 'right', fmt: '#,##0' },
    money('Ingresos (Bs)'),
    money('Ticket promedio (Bs)', 20),
    { header: 'Unidades', width: 12, align: 'right', fmt: '#,##0' },
  ];
  const aggTotal = ['TOTAL', stats.totalSalesCount, stats.totalRevenue, stats.avgTicket, stats.unitsSold];

  makeSheet('Mensual', 'FF2E7D32', 'FF2E7D32', 'Ventas por mes', aggCols('Mes'),
    aggRows(porMes, (k) => {
      const [y, m] = k.split('-').map(Number);
      const label = format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }), aggTotal);
  makeSheet('Diario', 'FF1565C0', 'FF1565C0', 'Ventas por día', aggCols('Fecha'),
    aggRows(porDia, (k) => k), aggTotal);

  // ── Ventas ──────────────────────────────────────────────────────────────
  makeSheet('Ventas', 'FF6A1B9A', 'FF6A1B9A', 'Detalle de ventas', [
    { header: 'ID', width: 8, align: 'center' },
    { header: 'N° factura', width: 12, align: 'center' },
    { header: 'Fecha', width: 18, align: 'center' },
    { header: 'Cliente', width: 28, align: 'left' },
    { header: 'Usuario', width: 16, align: 'left' },
    { header: 'Estado SIAT', width: 14, align: 'center' },
    { header: 'Unidades', width: 10, align: 'right' },
    money('Total (Bs)', 14),
  ], ventas.map((v) => [
    v.id, v.numeroFactura ?? '', format(new Date(v.fechaEmision), 'yyyy-MM-dd HH:mm'),
    v.nombreRazonSocial, v.usuario, v.estadoSiat ?? 'Sin factura',
    (v.detalles ?? []).reduce((s, d) => s + d.cantidad, 0), num(v.montoTotal),
  ]));

  // ── Ítems ───────────────────────────────────────────────────────────────
  const itemRows: (string | number)[][] = [];
  ventas.forEach((v) => {
    const fecha = format(new Date(v.fechaEmision), 'yyyy-MM-dd HH:mm');
    (v.detalles ?? []).forEach((d) =>
      itemRows.push([fecha, v.id, d.descripcion, d.cantidad, num(d.precioUnitario), num(d.subTotal)]),
    );
  });
  makeSheet('Ítems vendidos', 'FFEF6C00', 'FFEF6C00', 'Ítems vendidos (para tablas dinámicas)', [
    { header: 'Fecha', width: 18, align: 'center' },
    { header: 'ID venta', width: 10, align: 'center' },
    { header: 'Producto', width: 36, align: 'left' },
    { header: 'Cantidad', width: 10, align: 'right' },
    money('Precio unit. (Bs)'),
    money('Subtotal (Bs)', 14),
  ], itemRows);

  // ── Productos ───────────────────────────────────────────────────────────
  makeSheet('Productos', 'FFC62828', 'FFC62828', 'Ranking de productos', [
    { header: '#', width: 6, align: 'center' },
    { header: 'Producto', width: 36, align: 'left' },
    { header: 'Unidades', width: 12, align: 'right', fmt: '#,##0' },
    money('Ingresos (Bs)'),
    { header: '% de ingresos', width: 14, align: 'right', fmt: '0.0%' },
  ], allProducts.map((p, i) => [
    i + 1, p.name, p.qty, p.revenue, stats.totalRevenue ? p.revenue / stats.totalRevenue : 0,
  ]));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-ventas_${dateFrom}_${dateTo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
