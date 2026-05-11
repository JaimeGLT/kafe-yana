import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VentaReportStats, VentaDailyData, VentaPaymentData } from '../types/ventas';
import { formatCurrency } from '../utils';

interface SalesReportPdfOptions {
  dateFrom: string;
  dateTo: string;
  stats: VentaReportStats;
  dailySalesData: VentaDailyData[];
  paymentMethodData: VentaPaymentData[];
}

export function generateSalesReportPdf(opts: SalesReportPdfOptions): void {
  const { dateFrom, dateTo, stats, dailySalesData, paymentMethodData } = opts;

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
  doc.text('Reporte de Ventas', 14, 20);

  const fromLabel = format(new Date(dateFrom + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es });
  const toLabel = format(new Date(dateTo + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es });
  doc.text(`Período: ${fromLabel} — ${toLabel}`, pageWidth - 14, 20, { align: 'right' });

  // Generated date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  doc.text(`Generado: ${generatedAt}`, pageWidth - 14, 34, { align: 'right' });

  // KPIs
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del período', 14, 42);

  autoTable(doc, {
    startY: 46,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de ventas', stats.totalSalesCount.toString()],
      ['Ingresos totales', formatCurrency(stats.totalRevenue)],
      ['Ticket promedio', formatCurrency(stats.avgTicket)],
      ['Unidades vendidas', stats.unitsSold.toString()],
    ],
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Payment methods
  const afterKpis = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Ventas por método de pago', 14, afterKpis);

  autoTable(doc, {
    startY: afterKpis + 4,
    head: [['Método de pago', 'Total']],
    body: paymentMethodData.map(p => [p.metodo, formatCurrency(p.total)]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Daily sales
  const afterPayment = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Detalle de ventas diarias', 14, afterPayment);

  autoTable(doc, {
    startY: afterPayment + 4,
    head: [['Fecha', 'Ventas', 'Ingresos']],
    body: dailySalesData.map(d => [
      format(new Date(d.fecha + 'T00:00:00'), "dd/MM/yyyy"),
      d.ventas.toString(),
      formatCurrency(d.ingresos),
    ]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer on each page
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

  const filename = `reporte-ventas-${dateFrom}-${dateTo}.pdf`;
  doc.save(filename);
}
