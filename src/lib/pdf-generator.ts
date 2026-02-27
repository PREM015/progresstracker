// src/lib/pdf-generator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { prisma } from './prisma';
import { logger } from './logger';
import { format } from 'date-fns';
/* eslint-disable @typescript-eslint/no-unused-vars */


/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// TYPES
// =============================================================================

interface ReportData {
  userId: string;
  userName: string;
  userEmail: string;
  periodStart: Date;
  periodEnd: Date;
  type: string;
  stats: {
    totalProblems: number;
    totalCommits: number;
    totalTimeSpent: number;
    currentStreak: number;
    platformsActive: number;
    goalsCompleted: number;
  };
  highlights: Array<{
    metric: string;
    value: number;
    change: number;
  }>;
  platformBreakdown: Array<{
    platform: string;
    problems: number;
    commits: number;
    timeSpent: number;
  }>;
  dailyActivity: Array<{
    date: string;
    problems: number;
    commits: number;
    timeSpent: number;
  }>;
  insights: string[];
  recommendations: string[];
}

// =============================================================================
// PDF REPORT GENERATOR
// =============================================================================

export async function generateReportPDF(reportData: ReportData): Promise<Buffer> {
  try {
    logger.info('Generating PDF report', { userId: reportData.userId });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // =========================================================================
    // HEADER
    // =========================================================================
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Progress Report', margin, 30);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${format(reportData.periodStart, 'MMM dd, yyyy')} - ${format(reportData.periodEnd, 'MMM dd, yyyy')}`,
      margin,
      42
    );

    yPosition = 65;

    // =========================================================================
    // USER INFO
    // =========================================================================
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('User Information', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${reportData.userName}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Email: ${reportData.userEmail}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Report Type: ${reportData.type.toUpperCase()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, margin, yPosition);
    yPosition += 15;

    // =========================================================================
    // SUMMARY STATS
    // =========================================================================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', margin, yPosition);
    yPosition += 10;

    const statsData = [
      ['Problems Solved', reportData.stats.totalProblems.toString()],
      ['Commits Made', reportData.stats.totalCommits.toString()],
      ['Time Spent', `${Math.round(reportData.stats.totalTimeSpent / 60)} hours`],
      ['Current Streak', `${reportData.stats.currentStreak} days`],
      ['Active Platforms', reportData.stats.platformsActive.toString()],
      ['Goals Completed', reportData.stats.goalsCompleted.toString()],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // =========================================================================
    // HIGHLIGHTS
    // =========================================================================
    if (reportData.highlights.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Highlights', margin, yPosition);
      yPosition += 10;

      const highlightsData = reportData.highlights.map((h) => [
        h.metric,
        h.value.toString(),
        `${h.change > 0 ? '+' : ''}${h.change}%`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value', 'Change']],
        body: highlightsData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        columnStyles: {
          2: {
            cellWidth: 30,
            halign: 'right',
            textColor: [0, 0, 0],
          
          },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // =========================================================================
    // NEW PAGE - PLATFORM BREAKDOWN
    // =========================================================================
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    if (reportData.platformBreakdown.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Platform Breakdown', margin, yPosition);
      yPosition += 10;

      const platformData = reportData.platformBreakdown.map((p) => [
        p.platform,
        p.problems.toString(),
        p.commits.toString(),
        `${Math.round(p.timeSpent / 60)}h`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Platform', 'Problems', 'Commits', 'Time']],
        body: platformData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // =========================================================================
    // DAILY ACTIVITY (Last 7 days)
    // =========================================================================
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = margin;
    }

    if (reportData.dailyActivity.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Daily Activity', margin, yPosition);
      yPosition += 10;

      const dailyData = reportData.dailyActivity.slice(-7).map((d) => [
        d.date,
        d.problems.toString(),
        d.commits.toString(),
        `${Math.round(d.timeSpent / 60)}h`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Problems', 'Commits', 'Time']],
        body: dailyData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // =========================================================================
    // INSIGHTS & RECOMMENDATIONS
    // =========================================================================
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = margin;
    }

    if (reportData.insights.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Insights', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      reportData.insights.forEach((insight, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(`${index + 1}. ${insight}`, margin + 5, yPosition);
        yPosition += 7;
      });

      yPosition += 10;
    }

    if (reportData.recommendations.length > 0) {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      reportData.recommendations.forEach((rec, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(`${index + 1}. ${rec}`, margin + 5, yPosition);
        yPosition += 7;
      });
    }

    // =========================================================================
    // FOOTER ON ALL PAGES
    // =========================================================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        '© 2024 ProgressTracker. All rights reserved.',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // =========================================================================
    // GENERATE BUFFER
    // =========================================================================
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    logger.info('PDF report generated', {
      userId: reportData.userId,
      size: pdfBuffer.length,
      pages: totalPages,
    });

    return pdfBuffer;
  } catch (error) {
    logger.error('PDF generation failed', { userId: reportData.userId }, error);
    throw error;
  }
}

// =============================================================================
// FETCH REPORT DATA FROM DATABASE
// =============================================================================

export async function fetchReportData(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ReportData> {
  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        currentStreak: true,
        totalProblems: true,
        totalCommits: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get tracker entries for period
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: {
        platform: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate stats
    const stats = entries.reduce(
      (acc, entry) => {
        acc.totalProblems += entry.problemsSolved;
        acc.totalCommits += entry.commits;
        acc.totalTimeSpent += entry.timeSpent;
        return acc;
      },
      { totalProblems: 0, totalCommits: 0, totalTimeSpent: 0, currentStreak: user.currentStreak, platformsActive: 0, goalsCompleted: 0 }
    );

    // Platform breakdown
    const platformMap = new Map<string, { problems: number; commits: number; timeSpent: number }>();
    entries.forEach((entry) => {
      const platformName = entry.platform?.name || 'Other';
      const existing = platformMap.get(platformName) || { problems: 0, commits: 0, timeSpent: 0 };
      platformMap.set(platformName, {
        problems: existing.problems + entry.problemsSolved,
        commits: existing.commits + entry.commits,
        timeSpent: existing.timeSpent + entry.timeSpent,
      });
    });

    const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      ...data,
    }));

    stats.platformsActive = platformBreakdown.length;

    // Daily activity
    const dailyActivity = entries.map((entry) => ({
      date: format(entry.date, 'MMM dd'),
      problems: entry.problemsSolved,
      commits: entry.commits,
      timeSpent: entry.timeSpent,
    }));

    // Get goals completed in period
    const goalsCompleted = await prisma.goal.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lte: periodEnd },
      },
    });

    stats.goalsCompleted = goalsCompleted;

    // Generate highlights (compare with previous period)
    const previousPeriodStart = new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime()));
    const previousEntries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: previousPeriodStart, lt: periodStart },
      },
    });

    const previousStats = previousEntries.reduce(
      (acc, entry) => {
        acc.totalProblems += entry.problemsSolved;
        acc.totalCommits += entry.commits;
        return acc;
      },
      { totalProblems: 0, totalCommits: 0 }
    );

    const highlights = [
      {
        metric: 'Problems Solved',
        value: stats.totalProblems,
        change: previousStats.totalProblems > 0
          ? Math.round(((stats.totalProblems - previousStats.totalProblems) / previousStats.totalProblems) * 100)
          : 100,
      },
      {
        metric: 'Commits',
        value: stats.totalCommits,
        change: previousStats.totalCommits > 0
          ? Math.round(((stats.totalCommits - previousStats.totalCommits) / previousStats.totalCommits) * 100)
          : 100,
      },
    ];

    // Generate insights
    const insights: string[] = [];
    if (stats.currentStreak >= 7) {
      insights.push(`Great consistency! You've maintained a ${stats.currentStreak}-day streak.`);
    }
    if (stats.totalProblems > previousStats.totalProblems) {
      insights.push(`You solved ${stats.totalProblems - previousStats.totalProblems} more problems than last period!`);
    }
    if (platformBreakdown.length >= 3) {
      insights.push(`You're diversifying your skills across ${platformBreakdown.length} different platforms.`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (stats.currentStreak === 0) {
      recommendations.push('Start building a daily streak to maintain consistency.');
    }
    if (stats.totalTimeSpent < 600) {
      recommendations.push('Try to increase your daily practice time for better results.');
    }
    if (goalsCompleted === 0) {
      recommendations.push('Set specific goals to track your progress more effectively.');
    }

    return {
      userId: user.id,
      userName: user.name || 'User',
      userEmail: user.email || '',
      periodStart,
      periodEnd,
      type: 'custom',
      stats,
      highlights,
      platformBreakdown,
      dailyActivity,
      insights,
      recommendations,
    };
  } catch (error) {
    logger.error('Fetch report data failed', { userId }, error);
    throw error;
  }
}

// =============================================================================
// GENERATE AND SAVE REPORT
// =============================================================================

export async function generateAndSaveReport(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  type: string
): Promise<{ reportId: string; pdfUrl: string }> {
  try {
    // Fetch data
    const reportData = await fetchReportData(userId, periodStart, periodEnd);
    reportData.type = type;

    // Generate PDF
    const pdfBuffer = await generateReportPDF(reportData);

    // Save to database
    const report = await prisma.report.create({
      data: {
        userId,
        type,
        periodStart,
        periodEnd,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        summary: `Report for ${format(periodStart, 'MMM dd')} - ${format(periodEnd, 'MMM dd, yyyy')}`,
        data: reportData as any,
        status: 'generated',
      },
    });

    // TODO: Upload PDF to S3/storage and get URL
    // For now, we'll store it as base64 or save locally
    const pdfUrl = `/reports/${report.id}.pdf`;

    // Update report with PDF URL
    await prisma.report.update({
      where: { id: report.id },
      data: { pdfUrl },
    });

    logger.info('Report generated and saved', {
      reportId: report.id,
      userId,
    });

    return {
      reportId: report.id,
      pdfUrl,
    };
  } catch (error) {
    logger.error('Generate and save report failed', { userId }, error);
    throw error;
  }
}