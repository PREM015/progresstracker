// src/services/export/pdfExport.ts

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportData, ExportResult } from '@/types/export';
import { format } from 'date-fns';

export async function generatePDF(data: ExportData): Promise<ExportResult> {
  try {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CodeSync Pro - Progress Report', 20, yPosition);
    yPosition += 10;

    // User Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.user.name}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Username: @${data.user.username}`, 20, yPosition);
    yPosition += 6;
    doc.text(
      `Report Generated: ${format(data.exportDate, 'MMMM dd, yyyy')}`,
      20,
      yPosition
    );
    yPosition += 6;
    doc.text(
      `Period: ${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(
        data.dateRange.end,
        'MMM dd, yyyy'
      )}`,
      20,
      yPosition
    );
    yPosition += 15;

    // Statistics Section
    if (data.stats) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const stats = [
        ['Total Entries', data.stats.totalEntries.toString()],
        ['Problems Solved', data.stats.totalProblemsSolved.toString()],
        ['Time Spent', `${data.stats.totalTimeSpent} minutes`],
        ['Current Streak', `${data.stats.currentStreak} days`],
        ['Total Goals', data.stats.totalGoals.toString()],
        ['Completed Goals', data.stats.completedGoals.toString()],
        ['Achievements', data.stats.achievements.toString()],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: stats,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Tracker Entries Section
    if (data.trackerEntries && data.trackerEntries.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Activity Log', 20, yPosition);
      yPosition += 8;

      const entries = data.trackerEntries.slice(0, 50).map((entry) => [
        format(new Date(entry.date), 'MMM dd, yyyy'),
        entry.platform,
        entry.category,
        entry.problemsSolved?.toString() || '-',
        entry.timeSpent?.toString() || '-',
        entry.mood || '-',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Platform', 'Category', 'Problems', 'Time', 'Mood']],
        body: entries,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Goals Section (new page if needed)
    if (data.goals && data.goals.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Goals', 20, yPosition);
      yPosition += 8;

      const goals = data.goals.map((goal) => [
        goal.title,
        goal.category,
        `${goal.progress}/${goal.target}`,
        goal.status,
        goal.completedAt
          ? format(new Date(goal.completedAt), 'MMM dd, yyyy')
          : '-',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Title', 'Category', 'Progress', 'Status', 'Completed']],
        body: goals,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 },
      });
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');
    const fileName = `codesync-report-${format(data.exportDate, 'yyyy-MM-dd')}.pdf`;

    return {
      success: true,
      format: 'pdf',
      fileName,
      data: Buffer.from(pdfBuffer),
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      success: false,
      format: 'pdf',
      fileName: '',
      error: error instanceof Error ? error.message : 'PDF generation failed',
    };
  }
}