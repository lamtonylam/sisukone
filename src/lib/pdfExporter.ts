import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranscriptData, Course } from '@/types/student';
import {
  calculateCumulativeCredits,
  calculateWeightedGpa,
  calculateProjectedGraduation,
  calculateGradeDistribution,
  createGoalLine,
  isNumericGrade,
} from '@/lib/chartCalculations';
import { format } from 'date-fns';

export interface PdfExportOptions {
  anonymize?: boolean;
  includeChart?: boolean;
  sortOrder?: 'asc' | 'desc';
}

export interface AcademicYearSummary {
  academicYear: string;
  startYear: number;
  credits: number;
  coursesCount: number;
  gpa: number | null;
}

/**
 * Groups passed courses into Finnish university academic years (August 1 to July 31)
 */
export function calculateAcademicYearSummaries(courses: Course[]): AcademicYearSummary[] {
  const passedCourses = courses.filter((c) => c.passed && !c.isStudyModuleCredit && c.credits > 0);
  const map = new Map<
    string,
    {
      startYear: number;
      credits: number;
      coursesCount: number;
      weightedGpaSum: number;
      gradedCredits: number;
    }
  >();

  for (const course of passedCourses) {
    if (!course.date) continue;
    const d = new Date(course.date);
    if (isNaN(d.getTime())) continue;

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1 to 12
    const startYear = month >= 8 ? year : year - 1;
    const academicYear = `${startYear}–${startYear + 1}`;

    const existing = map.get(academicYear) ?? {
      startYear,
      credits: 0,
      coursesCount: 0,
      weightedGpaSum: 0,
      gradedCredits: 0,
    };

    existing.credits += course.credits;
    existing.coursesCount += 1;

    if (isNumericGrade(course.grade)) {
      const g = Number(course.grade);
      existing.weightedGpaSum += g * course.credits;
      existing.gradedCredits += course.credits;
    }

    map.set(academicYear, existing);
  }

  const summaries: AcademicYearSummary[] = [];
  for (const [academicYear, data] of map.entries()) {
    summaries.push({
      academicYear,
      startYear: data.startYear,
      credits: Math.round(data.credits * 10) / 10,
      coursesCount: data.coursesCount,
      gpa:
        data.gradedCredits > 0
          ? Math.round((data.weightedGpaSum / data.gradedCredits) * 100) / 100
          : null,
    });
  }

  return summaries.sort((a, b) => a.startYear - b.startYear);
}

/**
 * Generates an offscreen Highcharts progression chart as a base64 PNG data URL
 */
async function generateChartImage(transcript: TranscriptData): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  try {
    const HighchartsModule = await import('highcharts');
    const Highcharts = HighchartsModule.default || HighchartsModule;

    // Dynamically load exporting module for getSVG
    try {
      const exportingModule = await import('highcharts/modules/exporting');
      const exportingInit = exportingModule.default || exportingModule;
      if (typeof exportingInit === 'function') {
        exportingInit(Highcharts);
      }
    } catch {
      // Exporting already initialized or not available
    }

    const { points } = calculateCumulativeCredits(transcript.courses);
    if (points.length === 0) return null;

    const maxTimestamp = points[points.length - 1].timestamp;
    const goalPoints = createGoalLine(
      transcript.profile.studyStartDate || '2022-08-01',
      maxTimestamp,
      transcript.profile.targetCredits || 180,
      transcript.profile.nominalPace || 60,
    );

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '760px';
    container.style.height = '280px';
    container.style.visibility = 'hidden';
    document.body.appendChild(container);

    const chart = Highcharts.chart(container, {
      chart: {
        type: 'line',
        backgroundColor: '#ffffff',
        animation: false,
        style: {
          fontFamily: 'monospace, Courier, sans-serif',
        },
        marginRight: 24,
        marginBottom: 38,
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'top',
        itemStyle: {
          fontSize: '9px',
          fontWeight: 'bold',
          color: '#000000',
          textTransform: 'uppercase',
          fontFamily: 'monospace',
        },
      },
      xAxis: {
        type: 'datetime',
        lineColor: '#000000',
        lineWidth: 1.5,
        tickColor: '#000000',
        labels: {
          style: {
            fontSize: '8px',
            color: '#000000',
            fontFamily: 'monospace',
          },
        },
      },
      yAxis: {
        title: {
          text: 'CREDITS (OP)',
          style: {
            fontSize: '8px',
            fontWeight: 'bold',
            color: '#000000',
            fontFamily: 'monospace',
          },
        },
        lineColor: '#000000',
        lineWidth: 1.5,
        gridLineColor: '#eeeeee',
        labels: {
          style: {
            fontSize: '8px',
            color: '#000000',
            fontFamily: 'monospace',
          },
        },
        plotLines: [
          {
            value: transcript.profile.targetCredits || 180,
            color: '#1076db',
            dashStyle: 'Dash',
            width: 1.5,
            label: {
              text: `TARGET: ${transcript.profile.targetCredits || 180} OP`,
              align: 'right',
              style: {
                fontSize: '8px',
                fontWeight: 'bold',
                color: '#1076db',
                fontFamily: 'monospace',
              },
            },
          },
        ],
      },
      series: [
        {
          name: 'Cumulative Credits',
          type: 'line',
          step: 'left',
          color: '#1076db',
          lineWidth: 2.5,
          data: points.map((p) => [p.timestamp, p.cumulativeCredits]),
          marker: {
            enabled: points.length < 50,
            radius: 2.5,
            fillColor: '#1076db',
          },
        },
        {
          name: `Goal (${transcript.profile.nominalPace || 60} OP/yr)`,
          type: 'line',
          color: '#000000',
          lineWidth: 1.5,
          dashStyle: 'Dash',
          data: goalPoints.map((gp) => [gp.timestamp, gp.credits]),
          marker: { enabled: false },
        },
      ],
    });

    let svg: string | null = null;
    const chartAny = chart as unknown as { getSVG?: () => string };
    if (typeof chartAny.getSVG === 'function') {
      svg = chartAny.getSVG();
    }
    chart.destroy();
    container.remove();

    if (!svg) return null;

    return await svgToPng(svg, 760, 280);
  } catch (err) {
    console.warn('Highcharts PDF snapshot error:', err);
    return null;
  }
}

/**
 * Converts an SVG string to a high-resolution PNG data URL
 */
function svgToPng(svgString: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates a brutalist, print-perfect PDF dossier of the student transcript & analytics
 */
export async function generateTranscriptPdf(
  transcript: TranscriptData,
  options: PdfExportOptions = {},
): Promise<jsPDF> {
  const { anonymize = false, includeChart = true, sortOrder = 'desc' } = options;
  const { profile, courses } = transcript;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182

  const { totalCredits } = calculateCumulativeCredits(courses);
  const weightedGpa = calculateWeightedGpa(courses);
  const targetCredits = profile.targetCredits || 180;
  const nominalPace = profile.nominalPace || 60;
  const progressPercent = Math.min(100, Math.round((totalCredits / targetCredits) * 100));
  const remainingCredits = Math.max(0, targetCredits - totalCredits);
  const graduationInfo = calculateProjectedGraduation(profile, totalCredits);
  const gradeDistribution = calculateGradeDistribution(courses);
  const academicYears = calculateAcademicYearSummaries(courses);

  const displayName = anonymize
    ? 'ANONYMOUS CANDIDATE'
    : (profile.studentName || 'STUDENT').toUpperCase();

  // Set document metadata
  doc.setProperties({
    title: `Sisukone Dossier - ${displayName}`,
    subject: 'Academic Transcript & Analytics Report',
    author: 'Sisukone Engine',
    keywords: 'sisu, transcript, analytics, university, finland, degree',
    creator: 'Sisukone // Client-Side Degree Analytics',
  });

  // ==========================================
  // PAGE 1: EXECUTIVE SUMMARY & ANALYTICS
  // ==========================================

  // Top Dossier Header Banner (Solid Black)
  doc.setFillColor(0, 0, 0);
  doc.rect(marginX, 14, contentWidth, 16, 'F');

  // Blue Accent Rule below Banner
  doc.setFillColor(16, 118, 219); // #1076db
  doc.rect(marginX, 30, contentWidth, 2, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('SISU', marginX + 4, 24);

  doc.setTextColor(218, 237, 255); // #daedff
  doc.text('KONE', marginX + 18, 24);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('// ACADEMIC INTELLIGENCE DOSSIER', marginX + 38, 24);

  // Export Date on Top Right
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(218, 237, 255);
  doc.text(`REPORT: ${dateStr}`, marginX + contentWidth - 4, 24, { align: 'right' });

  // ------------------------------------------
  // Student Profile Card
  // ------------------------------------------
  const profileY = 36;
  const profileHeight = 22;

  // Box border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, profileY, contentWidth, profileHeight, 'FD');

  // Inverted Black Label
  doc.setFillColor(0, 0, 0);
  doc.rect(marginX, profileY, 44, 5, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('// CANDIDATE RECORD', marginX + 2, profileY + 3.5);

  // Student Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text(displayName, marginX + 4, profileY + 11);

  // Degree & Pace Details
  const degreeStr = profile.degreeProgramme
    ? profile.degreeProgramme.toUpperCase()
    : 'DEGREE PROGRAMME NOT SPECIFIED';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(
    degreeStr.length > 55 ? `${degreeStr.slice(0, 52)}...` : degreeStr,
    marginX + 4,
    profileY + 17,
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `START: ${profile.studyStartDate}  //  PACE: ${nominalPace} OP/YR`,
    marginX + contentWidth - 4,
    profileY + 17,
    { align: 'right' },
  );

  // ------------------------------------------
  // KPI 4-Quadrant Grid
  // ------------------------------------------
  const kpiY = profileY + profileHeight + 4; // ~62
  const kpiHeight = 23;
  const kpiGap = 2.66;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4; // ~43.5mm

  const renderKpiBox = (
    index: number,
    tag: string,
    value: string,
    unit: string,
    subtext: string,
    progressBarPercent?: number,
  ) => {
    const x = marginX + index * (kpiWidth + kpiGap);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, kpiY, kpiWidth, kpiHeight, 'FD');

    // Title slug
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(16, 118, 219);
    doc.text(tag, x + 2.5, kpiY + 4.5);

    // Big Value & Unit
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(value, x + 2.5, kpiY + 12);

    const valWidth = doc.getTextWidth(value);
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(unit, x + 2.5 + valWidth + 1.5, kpiY + 11.5);

    // Subtext or Progress Bar
    if (progressBarPercent !== undefined) {
      const barY = kpiY + 14.5;
      const barW = kpiWidth - 5;
      const barH = 2.5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(x + 2.5, barY, barW, barH);
      const fillW = Math.max(0, Math.min(barW, (barW * progressBarPercent) / 100));
      if (fillW > 0) {
        doc.setFillColor(16, 118, 219);
        doc.rect(x + 2.5, barY, fillW, barH, 'F');
      }

      doc.setFont('courier', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`${progressBarPercent}% (${remainingCredits} OP LEFT)`, x + 2.5, kpiY + 20.5);
    } else {
      // Bottom divider line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(x + 2.5, kpiY + 15.5, x + kpiWidth - 2.5, kpiY + 15.5);

      doc.setFont('courier', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(80, 80, 80);
      doc.text(subtext, x + 2.5, kpiY + 19.5);
    }
  };

  renderKpiBox(
    0,
    '// 01. CREDITS',
    String(totalCredits),
    `/ ${targetCredits} OP`,
    '',
    progressPercent,
  );

  renderKpiBox(
    1,
    '// 02. GPA (KA)',
    weightedGpa !== null ? weightedGpa.toFixed(2) : '—',
    '/ 5.00',
    'CREDITS WEIGHTED',
  );

  renderKpiBox(
    2,
    '// 03. ANNUAL PACE',
    graduationInfo ? String(graduationInfo.paceCreditsPerYear) : '—',
    'OP/YR',
    `GOAL: ${nominalPace} OP/YR`,
  );

  renderKpiBox(
    3,
    '// 04. GRADUATION',
    graduationInfo?.projectedDate ? graduationInfo.projectedDate.toUpperCase() : '—',
    '',
    'LINEAR EXTRAPOLATION',
  );

  // ------------------------------------------
  // Cumulative Credit Progression Chart / Graphic
  // ------------------------------------------
  let nextY = kpiY + kpiHeight + 4; // ~89mm

  if (includeChart) {
    const chartBoxY = nextY;
    const chartBoxHeight = 68;

    // Outer Container
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, chartBoxY, contentWidth, chartBoxHeight, 'FD');

    // Title Bar of Chart
    doc.setFillColor(0, 0, 0);
    doc.rect(marginX, chartBoxY, contentWidth, 5.5, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('// CUMULATIVE CREDIT PROGRESSION CURVE (ECTS / OP)', marginX + 3, chartBoxY + 3.8);

    // Try rendering offscreen Highcharts chart image
    let chartImage: string | null = null;
    try {
      chartImage = await generateChartImage(transcript);
    } catch {
      chartImage = null;
    }

    if (chartImage) {
      doc.addImage(
        chartImage,
        'PNG',
        marginX + 1,
        chartBoxY + 6,
        contentWidth - 2,
        chartBoxHeight - 7,
      );
    } else {
      // Fallback clean vector progression line
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'VELOCITY TIMELINE: ' +
          academicYears.map((ay) => `${ay.academicYear}: ${ay.credits} OP`).join('  |  '),
        marginX + 4,
        chartBoxY + 15,
      );

      // Draw vector progress milestones
      const timelineY = chartBoxY + 35;
      const timelineW = contentWidth - 20;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(marginX + 10, timelineY, marginX + 10 + timelineW, timelineY);

      academicYears.forEach((ay, idx) => {
        const stepX = marginX + 10 + (idx / Math.max(1, academicYears.length - 1)) * timelineW;
        doc.setFillColor(16, 118, 219);
        doc.circle(stepX, timelineY, 2.5, 'FD');
        doc.setFont('courier', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text(ay.academicYear, stepX, timelineY - 6, { align: 'center' });
        doc.text(`${ay.credits} OP`, stepX, timelineY + 8, { align: 'center' });
      });
    }

    nextY = chartBoxY + chartBoxHeight + 4;
  }

  // ------------------------------------------
  // Grade Distribution & Annual Progression (Two Columns)
  // ------------------------------------------
  const colWidth = (contentWidth - 4) / 2; // ~89mm

  // Left Table: Grade Distribution
  autoTable(doc, {
    startY: nextY,
    margin: { left: marginX, right: marginX + colWidth + 4 },
    tableWidth: colWidth,
    head: [['GRADE', 'COURSES', 'ECTS', 'SHARE']],
    body: gradeDistribution.map((gd) => [
      gd.grade === 'Pass' ? 'PASS (HYV)' : `GRADE ${gd.grade}`,
      String(gd.count),
      `${gd.credits} OP`,
      `${gd.percentage}%`,
    ]),
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1.4,
      font: 'courier',
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'courier',
      fontSize: 7,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 23 },
    },
    didDrawPage: (data) => {
      // Add section title above the table
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('// GRADE DISTRIBUTION', marginX, data.settings.startY - 1.5);
    },
  });

  // Right Table: Academic Year Progression
  autoTable(doc, {
    startY: nextY,
    margin: { left: marginX + colWidth + 4, right: marginX },
    tableWidth: colWidth,
    head: [['ACADEMIC YEAR', 'COURSES', 'ECTS', 'GPA']],
    body: academicYears.map((ay) => [
      ay.academicYear,
      String(ay.coursesCount),
      `${ay.credits} OP`,
      ay.gpa !== null ? ay.gpa.toFixed(2) : '—',
    ]),
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1.4,
      font: 'courier',
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'courier',
      fontSize: 7,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 21 },
    },
    didDrawPage: (data) => {
      // Add section title above the table
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('// ANNUAL PROGRESSION', marginX + colWidth + 4, data.settings.startY - 1.5);
    },
  });

  // ==========================================
  // PAGE 2+: COURSE ATTAINMENTS RECORD TABLE
  // ==========================================
  doc.addPage();

  // Page 2 Header Banner
  doc.setFillColor(0, 0, 0);
  doc.rect(marginX, 14, contentWidth, 12, 'F');

  doc.setFillColor(16, 118, 219);
  doc.rect(marginX, 26, contentWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('SISUKONE', marginX + 3, 21.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(218, 237, 255);
  doc.text('// OFFICIAL COURSE ATTAINMENTS RECORD', marginX + 28, 21.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(218, 237, 255);
  doc.text(displayName, marginX + contentWidth - 3, 21.5, { align: 'right' });

  // Filter individual courses
  const sortedCourses = [...courses]
    .filter((c) => !c.isStudyModuleCredit)
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

  // Build Table Data
  const courseTableBody = sortedCourses.map((c) => [
    c.date || '—',
    c.code || '—',
    c.name || 'Untitled Course',
    `${Number(c.credits).toFixed(1)} OP`,
    String(c.grade || '—').toUpperCase(),
    c.passed ? 'PASSED' : 'FAILED',
  ]);

  autoTable(doc, {
    startY: 32,
    margin: { left: marginX, right: marginX, bottom: 18 },
    showHead: 'everyPage',
    head: [['DATE', 'CODE', 'COURSE TITLE', 'CREDITS', 'GRADE', 'STATUS']],
    body: courseTableBody,
    foot: [
      [
        '',
        '',
        `TOTAL ATTAINMENTS: ${sortedCourses.length} COURSES`,
        `${totalCredits.toFixed(1)} OP`,
        weightedGpa !== null ? `GPA ${weightedGpa.toFixed(2)}` : '—',
        'VERIFIED',
      ],
    ],
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [0, 0, 0],
      lineColor: [220, 220, 220],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'courier',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'courier',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 22, font: 'courier', halign: 'center' },
      1: { cellWidth: 26, font: 'courier', fontStyle: 'bold' },
      2: { cellWidth: 'auto', font: 'helvetica' },
      3: { cellWidth: 20, font: 'courier', fontStyle: 'bold', halign: 'right' },
      4: { cellWidth: 16, font: 'courier', fontStyle: 'bold', halign: 'center' },
      5: { cellWidth: 18, font: 'courier', fontStyle: 'bold', halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const isOddRow = data.row.index % 2 === 1;
        if (isOddRow) {
          data.cell.styles.fillColor = [248, 250, 252];
        }

        // Highlight failed courses
        const isPassed = Array.isArray(data.row.raw) ? data.row.raw[5] === 'PASSED' : true;
        if (!isPassed) {
          data.cell.styles.textColor = [200, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ==========================================
  // RUNNING FOOTERS ON ALL PAGES
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = 288;

    // Divider Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 3, marginX + contentWidth, footerY - 3);

    // Left Disclaimer
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('SISUKONE // 100% CLIENT-SIDE ENCLAVE // ZERO SERVER STORAGE', marginX, footerY);

    // Right Page Number
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(`PAGE ${p} OF ${totalPages}`, marginX + contentWidth, footerY, { align: 'right' });
  }

  return doc;
}

/**
 * Convenience helper to generate and automatically trigger browser download of the PDF dossier
 */
export async function exportTranscriptPdf(
  transcript: TranscriptData,
  options: PdfExportOptions = {},
): Promise<void> {
  const doc = await generateTranscriptPdf(transcript, options);

  const safeName = options.anonymize
    ? 'anonymous'
    : transcript.profile.studentName
      ? transcript.profile.studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : 'student';

  const dateTag = transcript.profile.studyStartDate || format(new Date(), 'yyyy-MM-dd');
  const filename = `sisukone-dossier-${safeName}-${dateTag}.pdf`;

  doc.save(filename);
}
