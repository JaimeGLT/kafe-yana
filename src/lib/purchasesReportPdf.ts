import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  PurchasesReportStats,
  PurchasesMonthlyData,
  PurchasesSupplierData,
  OrdenCompraNode,
} from '../types/ordenesCompra';
import { formatCurrency } from '../utils';

interface PurchasesReportPdfOptions {
  dateFrom: string;
  dateTo: string;
  stats: PurchasesReportStats;
  monthlyData: PurchasesMonthlyData[];
  topSuppliers: PurchasesSupplierData[];
  filteredOrders: OrdenCompraNode[];
}

export function generatePurchasesReportPdf(opts: PurchasesReportPdfOptions): void {
  const { dateFrom, dateTo, stats, monthlyData, topSuppliers, filteredOrders } = opts;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(139, 69, 19);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Kafe Yana', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte de Compras', 14, 20);

  const fromLabel = format(new Date(dateFrom + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es });
  const toLabel = format(new Date(dateTo + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es });
  doc.text(`Período: ${fromLabel} — ${toLabel}`, pageWidth - 14, 20, { align: 'right' });

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - 14, 34, { align: 'right' });

  // KPIs
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del período', 14, 42);

  autoTable(doc, {
    startY: 46,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total órdenes', stats.totalOrders.toString()],
      ['Valor total compras', formatCurrency(stats.totalValue)],
      ['Órdenes pendientes', stats.pendingCount.toString()],
      ['Proveedores únicos', stats.uniqueSuppliers.toString()],
    ],
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Monthly breakdown
  const afterKpis = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Compras por mes', 14, afterKpis);

  autoTable(doc, {
    startY: afterKpis + 4,
    head: [['Mes', 'Total']],
    body: monthlyData.map(m => [m.mes, formatCurrency(m.total)]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Top suppliers
  const afterMonthly = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Top proveedores', 14, afterMonthly);

  autoTable(doc, {
    startY: afterMonthly + 4,
    head: [['Proveedor', 'Órdenes', 'Total']],
    body: topSuppliers.map(s => [s.name, s.count.toString(), formatCurrency(s.total)]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // Orders detail
  const afterSuppliers = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Detalle de órdenes', 14, afterSuppliers);

  autoTable(doc, {
    startY: afterSuppliers + 4,
    head: [['Código', 'Fecha', 'Proveedor', 'Estado', 'Total']],
    body: [...filteredOrders]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map(o => [
        o.codigo,
        format(new Date(o.fecha), 'dd/MM/yyyy'),
        o.nombre_Proveedor,
        o.estado ?? (o.recibido ? 'Recibido' : 'Pendiente'),
        formatCurrency(o.total),
      ]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  doc.save(`reporte-compras-${dateFrom}-${dateTo}.pdf`);
}
