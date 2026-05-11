import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReporteStats, CriticalStockItem, ExpiringItem } from '../types/reports';
import { formatCurrency } from '../utils';

interface InventoryReportPdfOptions {
  stats: ReporteStats;
  categoryData: Array<{ name: string; count: number }>;
  criticalItems: CriticalStockItem[];
  expiringItems: ExpiringItem[];
}

export function generateInventoryReportPdf(opts: InventoryReportPdfOptions): void {
  const { stats, categoryData, criticalItems, expiringItems } = opts;

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
  doc.text('Reporte de Inventario', 14, 20);

  const now = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });
  doc.text(`Fecha: ${now}`, pageWidth - 14, 20, { align: 'right' });

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - 14, 34, { align: 'right' });

  // KPIs
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del inventario', 14, 42);

  autoTable(doc, {
    startY: 46,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total productos', stats.totalProducts.toString()],
      ['Total insumos', stats.totalInsumos.toString()],
      ['Items con stock bajo', stats.lowStockItems.toString()],
      ['Valor del inventario', formatCurrency(stats.totalValue)],
    ],
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Category distribution
  const afterKpis = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Distribución por categoría', 14, afterKpis);

  autoTable(doc, {
    startY: afterKpis + 4,
    head: [['Categoría', 'Productos']],
    body: categoryData.map(c => [c.name, c.count.toString()]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // Critical items
  const afterCat = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(`Stock bajo crítico (${criticalItems.length} items)`, 14, afterCat);

  autoTable(doc, {
    startY: afterCat + 4,
    head: [['Tipo', 'Nombre', 'Categoría', 'Stock', 'Mínimo', 'Ratio']],
    body: criticalItems.map(item => [
      item.tipo === 'insumo' ? 'Insumo' : 'Comprado',
      item.name,
      item.categoryName,
      `${item.stock}${item.unidad ? ` ${item.unidad}` : ''}`,
      `${item.minStock}${item.unidad ? ` ${item.unidad}` : ''}`,
      `${(item.ratio * 100).toFixed(0)}%`,
    ]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Top expiring
  const afterCritical = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Top 10 — Próximos a agotarse', 14, afterCritical);

  autoTable(doc, {
    startY: afterCritical + 4,
    head: [['#', 'Nombre', 'Categoría', 'Stock', 'Mínimo', 'Ratio']],
    body: expiringItems.map((item, idx) => [
      (idx + 1).toString(),
      item.name,
      item.categoryName,
      `${item.stock}${item.unidad ? ` ${item.unidad}` : ''}`,
      `${item.minStock}${item.unidad ? ` ${item.unidad}` : ''}`,
      `${(item.ratio * 100).toFixed(0)}%`,
    ]),
    headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 245] },
    columnStyles: {
      0: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
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

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  doc.save(`reporte-inventario-${dateStr}.pdf`);
}
