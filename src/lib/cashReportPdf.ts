import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  CashReportStats,
  CashCategoryData,
  CajaHistorialNode,
} from '../types/cajaHistorial';
import { formatCurrency } from '../utils';

interface CashReportPdfOptions {
  dateFrom: string;
  dateTo: string;
  stats: CashReportStats;
  categoryData: CashCategoryData[];
  filteredSessions: CajaHistorialNode[];
}

export function generateCashReportPdf(opts: CashReportPdfOptions): void {
  const { dateFrom, dateTo, stats, categoryData, filteredSessions } = opts;

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
  doc.text('Reporte de Caja', 14, 20);

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
      ['Sesiones de caja', stats.sesionesCount.toString()],
      ['Total ingresos', formatCurrency(stats.totalIngresos)],
      ['Total egresos', formatCurrency(stats.totalEgresos)],
      ['Total ventas POS', formatCurrency(stats.totalVentas)],
      ['Balance neto', formatCurrency(stats.balanceNeto)],
    ],
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Category breakdown
  const afterKpis = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Movimientos por categoría', 14, afterKpis);

  autoTable(doc, {
    startY: afterKpis + 4,
    head: [['Categoría', 'Tipo', 'Movimientos', 'Total']],
    body: categoryData.map(c => [c.category, c.tipo, c.count.toString(), formatCurrency(c.total)]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // Sessions detail
  const afterCategories = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Sesiones de caja', 14, afterCategories);

  autoTable(doc, {
    startY: afterCategories + 4,
    head: [['Código', 'Apertura', 'Cierre', 'Ingresos', 'Egresos', 'Ventas', 'Estado']],
    body: [...filteredSessions]
      .sort((a, b) => new Date(b.apertura).getTime() - new Date(a.apertura).getTime())
      .map(s => [
        s.codigo,
        format(new Date(s.apertura), 'dd/MM/yyyy HH:mm'),
        s.cierre ? format(new Date(s.cierre), 'dd/MM/yyyy HH:mm') : '—',
        formatCurrency(s.totalIngresos),
        formatCurrency(Math.abs(s.totalEgresos)),
        formatCurrency(s.totalVentas),
        s.estado,
      ]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
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

  doc.save(`reporte-caja-${dateFrom}-${dateTo}.pdf`);
}
