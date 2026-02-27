// src/services/export/pdfExport.ts
import { logger } from '@/lib/logger';
import type { ExportData, ExportResult } from '@/types/export';


const log = logger.child({ service: 'PDFExport' });

export async function generatePDF(data: ExportData): Promise<ExportResult> {
  try {
    // Dynamic import to avoid SSR issues
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('Progress Tracker Report', 14, 20);

    // User Info
    doc.setFontSize(12);
    doc.text(`User: ${data.user.name}`, 14, 30);
    doc.text(
      `Period: ${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`,
      14,
      37
    );

    // Stats Summary
    if (data.stats) {
      doc.setFontSize(14);
      doc.text('Summary Statistics', 14, 50);

      doc.setFontSize(10);
      let yPos = 58;
      doc.text(`Total Entries: ${data.stats.totalEntries}`, 14, yPos);
      doc.text(`Total Problems Solved: ${data.stats.totalProblemsSolved}`, 14, (yPos += 7));
   doc.text(`Total Time Spent: ${Math.round((data.stats.totalTimeSpent ?? 0) / 60)} hours`, 14, (yPos += 7));

      doc.text(`Current Streak: ${data.stats.currentStreak} days`, 14, (yPos += 7));
      doc.text(`Active Goals: ${data.stats.totalGoals}`, 14, (yPos += 7));
      doc.text(`Achievements Unlocked: ${data.stats.achievements}`, 14, (yPos += 7));
    }

    // Tracker Entries Table
    if (data.trackerEntries.length > 0) {
      autoTable(doc, {
        startY: 100,
        head: [['Date', 'Platform', 'Problems', 'Time (min)', 'Notes']],
        body: data.trackerEntries.slice(0, 50).map((entry) => [
          entry.date,
          entry.platform,
          entry.problemsSolved?.toString() || '0',
          entry.timeSpent?.toString() || '0',
          (entry.notes || '').substring(0, 30),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    const pdfOutput = doc.output('arraybuffer');
    const fileName = `progress-tracker-${new Date().toISOString().split('T')[0]}.pdf`;

    log.info('PDF export generated', { fileName, size: pdfOutput.byteLength });

    return {
      success: true,
      format: 'pdf',
      fileName,
      content: Buffer.from(pdfOutput).toString('base64'),
      size: pdfOutput.byteLength,
    };
  } catch (error) {
    log.error('Error generating PDF export', {}, error);
    return {
      success: false,
      format: 'pdf',
      fileName: '',
      error: error instanceof Error ? error.message : 'PDF generation failed',
    };
  }
}

export default generatePDF;