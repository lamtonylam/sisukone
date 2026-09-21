'use client';

import React, { useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import stockInit from 'highcharts/modules/stock';
import exportingInit from 'highcharts/modules/exporting';
import exportDataInit from 'highcharts/modules/export-data';
import { TranscriptData, GraphSize } from '@/types/student';
import { calculateCumulativeCredits, createGoalLine } from '@/lib/chartCalculations';
import { format } from 'date-fns';

// Initialize Highcharts Stock and Exporting modules on client
if (typeof Highcharts === 'object') {
  try {
    stockInit(Highcharts);
    exportingInit(Highcharts);
    exportDataInit(Highcharts);
  } catch {
    // Already initialized
  }
}

interface StudentCreditGraphProps {
  transcript: TranscriptData;
}

const HEIGHT_CONFIG: Record<GraphSize, number> = {
  small: 360,
  medium: 520,
  large: 750,
};

export function StudentCreditGraph({ transcript }: StudentCreditGraphProps) {
  const [graphSize, setGraphSize] = useState<GraphSize>('medium');
  const [showGoalLine, setShowGoalLine] = useState(true);

  const { profile, courses } = transcript;
  const { points, totalCredits } = useMemo(() => calculateCumulativeCredits(courses), [courses]);

  const chartHeight = HEIGHT_CONFIG[graphSize];

  // Prepare Highcharts series data
  const studentSeriesData = useMemo(() => {
    const dateCounts: Record<string, number> = {};
    return points.map((pt) => {
      const key = pt.course.date || String(pt.timestamp);
      const count = dateCounts[key] || 0;
      dateCounts[key] = count + 1;

      // When multiple courses share the exact same date, space them by 4 hours
      // so each point has its own distinct marker position and hover target,
      // while remaining within the same calendar day.
      const offsetMs = count * (4 * 60 * 60 * 1000);

      return {
        x: pt.timestamp + offsetMs,
        realDate: pt.timestamp,
        y: pt.cumulativeCredits,
        courseCode: pt.course.code,
        courseName: pt.course.name,
        creditsGained: pt.course.credits,
        grade: pt.course.grade,
        dateFormatted: pt.course.date,
        passed: pt.course.passed,
      };
    });
  }, [points]);

  const maxTimestamp = useMemo(() => {
    if (points.length === 0) return new Date().getTime();
    return points[points.length - 1].timestamp;
  }, [points]);

  const goalSeriesData = useMemo(() => {
    if (!showGoalLine) return [];
    const goalPoints = createGoalLine(
      profile.studyStartDate || '2022-08-01',
      maxTimestamp,
      profile.targetCredits || 180,
      profile.nominalPace || 60,
    );
    return goalPoints.map((gp) => [gp.timestamp, gp.credits]);
  }, [showGoalLine, profile, maxTimestamp]);

  const chartOptions: Highcharts.Options = useMemo(() => {
    return {
      chart: {
        type: 'line',
        height: chartHeight,
        style: {
          fontFamily: 'inherit',
        },
        backgroundColor: '#ffffff',
        borderWidth: 0,
        zooming: {
          type: 'x',
        },
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      rangeSelector: {
        enabled: true,
        selected: 4, // All
        buttons: [
          { type: 'month', count: 6, text: '6M' },
          { type: 'year', count: 1, text: '1Y' },
          { type: 'year', count: 2, text: '2Y' },
          { type: 'year', count: 3, text: '3Y' },
          { type: 'all', text: 'ALL' },
        ],
        inputEnabled: true,
        inputStyle: {
          color: '#000000',
          fontWeight: 'bold',
          fontFamily: 'monospace',
        },
        labelStyle: {
          color: '#000000',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
        },
        buttonTheme: {
          fill: '#ffffff',
          stroke: '#000000',
          'stroke-width': 2,
          r: 0,
          style: {
            color: '#000000',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            fontSize: '10px',
          },
          states: {
            hover: {
              fill: '#000000',
              style: {
                color: '#ffffff',
              },
            },
            select: {
              fill: '#1076db',
              stroke: '#000000',
              style: {
                color: '#ffffff',
                fontWeight: '900',
              },
            },
          },
        },
      },
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 600,
            },
            chartOptions: {
              rangeSelector: {
                inputEnabled: false,
                buttonSpacing: 1,
              },
              navigator: {
                height: 28,
                margin: 8,
              },
              yAxis: {
                title: {
                  text: undefined,
                },
              },
            },
          },
        ],
      },
      navigator: {
        enabled: true,
        height: 35,
        margin: 12,
        maskFill: 'rgba(16, 118, 219, 0.2)',
        outlineColor: '#000000',
        outlineWidth: 2,
        series: {
          color: '#1076db',
          fillOpacity: 0.15,
          lineWidth: 2,
        },
      },
      scrollbar: {
        enabled: true,
        barBackgroundColor: '#000000',
        barBorderColor: '#000000',
        barBorderRadius: 0,
        buttonBackgroundColor: '#ffffff',
        buttonBorderColor: '#000000',
        buttonBorderRadius: 0,
        trackBackgroundColor: '#ffffff',
        trackBorderColor: '#000000',
        trackBorderWidth: 1,
      },
      xAxis: {
        type: 'datetime',
        ordinal: false,
        lineColor: '#000000',
        lineWidth: 2,
        gridLineWidth: 1,
        gridLineColor: '#e5e5e5',
        gridLineDashStyle: 'Dash',
        labels: {
          style: {
            color: '#000000',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          formatter: function () {
            return format(new Date(Number(this.value)), 'yyyy');
          },
        },
      },
      yAxis: {
        title: {
          text: 'CREDITS (OP)',
          align: 'high',
          offset: 0,
          rotation: 0,
          y: -12,
          style: {
            color: '#000000',
            fontSize: '10px',
            fontWeight: '900',
            fontFamily: 'monospace',
          },
        },
        opposite: true,
        min: 0,
        lineColor: '#000000',
        lineWidth: 2,
        gridLineWidth: 1,
        gridLineColor: '#e5e5e5',
        gridLineDashStyle: 'Dash',
        labels: {
          style: {
            color: '#000000',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
        },
      },
      legend: {
        enabled: true,
        align: 'left',
        verticalAlign: 'top',
        layout: 'horizontal',
        itemStyle: {
          color: '#000000',
          fontSize: '10px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
        },
      },
      tooltip: {
        useHTML: true,
        style: {
          pointerEvents: 'none',
        },
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderRadius: 0,
        borderWidth: 2,
        shadow: false,
        padding: 0,
        formatter: function () {
          const point = this.point as unknown as {
            courseName?: string;
            courseCode?: string;
            creditsGained?: number;
            grade?: string;
            dateFormatted?: string;
            y: number;
          };

          if (this.series.name === 'NOMINAL PACE (60 OP/YR)') {
            return `<div style="padding: 6px 8px; font-family: monospace; font-size: 10px; border: 2px solid #000000; background: #ffffff; pointer-events: none;">
              <div style="font-weight: 900; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 2px; margin-bottom: 3px;">// NOMINAL BENCHMARK</div>
              <div>PACE: <strong>${Math.round(this.y || 0)} OP</strong></div>
              <div>DATE: ${format(new Date(Number(this.x)), 'dd.MM.yyyy')}</div>
            </div>`;
          }

          if (point.courseName) {
            return `<div style="padding: 8px; font-size: 11px; border: 2px solid #000000; background: #ffffff; max-width: 250px; pointer-events: none;">
              <div style="font-family: monospace; font-size: 9px; font-weight: 900; color: #1d65b8; text-transform: uppercase;">
                // COMPLETION
              </div>
              <div style="font-weight: 900; color: #000000; text-transform: uppercase; font-size: 11px; margin: 2px 0 4px 0; border-bottom: 2px solid #000000; padding-bottom: 3px;">
                ${point.courseName} <span style="font-family: monospace; font-weight: normal;">[${point.courseCode}]</span>
              </div>
              <div style="font-family: monospace; font-size: 10px; line-height: 1.5; color: #000000;">
                <div>CREDITS: <strong>+${point.creditsGained} OP</strong> (TOTAL: <strong>${point.y} OP</strong>)</div>
                <div>GRADE: <strong style="background: #1076db; color: #ffffff; padding: 1px 4px;">${point.grade}</strong></div>
                <div style="color: #666666;">DATE: ${point.dateFormatted}</div>
              </div>
            </div>`;
          }

          return `<div style="padding: 6px; font-family: monospace; font-weight: bold; font-size: 10px; pointer-events: none;">CREDITS: ${this.y} OP</div>`;
        },
      },
      plotOptions: {
        series: {
          animation: false,
          findNearestPointBy: 'xy',
        },
        line: {
          findNearestPointBy: 'xy',
          step: 'left',
          marker: {
            enabled: true,
            radius: 3.5,
            symbol: 'square',
            fillColor: '#1076db',
            lineWidth: 2,
            lineColor: '#000000',
            states: {
              hover: {
                radius: 5.5,
                fillColor: '#000000',
                lineColor: '#1076db',
                lineWidth: 2,
              },
            },
          },
        },
      },
      series: [
        {
          name: profile.studentName ? profile.studentName.toUpperCase() : 'STUDENT PROGRESSION',
          type: 'line',
          data: studentSeriesData,
          color: '#1076db',
          lineWidth: 2.5,
        },
        ...(showGoalLine && goalSeriesData.length > 0
          ? [
              {
                name: 'NOMINAL PACE (60 OP/YR)',
                type: 'line' as const,
                step: undefined,
                data: goalSeriesData,
                color: '#000000',
                dashStyle: 'Dash' as Highcharts.DashStyleValue,
                lineWidth: 2,
                marker: {
                  enabled: false,
                },
              },
            ]
          : []),
      ],
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            theme: {
              fill: '#ffffff',
              stroke: '#000000',
              'stroke-width': 2,
              r: 0,
            },
            menuItems: [
              'downloadPNG',
              'downloadJPEG',
              'downloadPDF',
              'downloadSVG',
              'separator',
              'downloadCSV',
            ],
          },
        },
      },
    };
  }, [chartHeight, studentSeriesData, goalSeriesData, showGoalLine, profile.studentName]);

  return (
    <div className="space-y-3">
      {/* Top Toolbar: Size Buttons & Goal Pace Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-2 border-black bg-white p-2.5 sm:p-3">
        {/* Graph Size Selector */}
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] sm:text-xs font-black uppercase text-black mr-1 sm:mr-2">
            CANVAS:
          </span>
          {(['small', 'medium', 'large'] as GraphSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setGraphSize(size)}
              className={`border-2 border-black px-2.5 sm:px-3.5 py-1 font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider transition-none cursor-pointer ${
                graphSize === size
                  ? 'bg-[#1076db] text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Goal Pace Line Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-200">
          <label className="flex items-center gap-2 font-mono text-[11px] sm:text-xs font-bold uppercase text-black cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGoalLine}
              onChange={(e) => setShowGoalLine(e.target.checked)}
              className="h-4 w-4 border-2 border-black rounded-none text-black focus:ring-0 cursor-pointer"
            />
            <span>NOMINAL PACE (60 OP)</span>
          </label>

          <span className="font-mono text-xs text-neutral-400">//</span>

          <span className="font-mono text-[11px] sm:text-xs font-black uppercase text-black">
            <strong className="text-[#1076db]">{totalCredits} OP</strong>
          </span>
        </div>
      </div>

      {/* Highcharts Brutalist Box */}
      <div className="border-2 border-black bg-white p-2 sm:p-4 overflow-hidden">
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={'stockChart'}
          options={chartOptions}
        />
      </div>
    </div>
  );
}
