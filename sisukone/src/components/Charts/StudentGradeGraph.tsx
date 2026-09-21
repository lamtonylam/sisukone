'use client';

import React, { useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { TranscriptData, GradeGraphMode } from '@/types/student';
import {
  calculateTotalMeanSeries,
  calculateGroupMeanSeries,
  calculateSemesterMeanSeries,
} from '@/lib/chartCalculations';
import { format } from 'date-fns';

interface StudentGradeGraphProps {
  transcript: TranscriptData;
}

export function StudentGradeGraph({ transcript }: StudentGradeGraphProps) {
  const [graphMode, setGraphMode] = useState<GradeGraphMode>('total');
  const [groupSize, setGroupSize] = useState(5);

  const { courses } = transcript;

  const totalMeans = useMemo(() => calculateTotalMeanSeries(courses), [courses]);
  const groupMeans = useMemo(() => calculateGroupMeanSeries(courses, groupSize), [courses, groupSize]);
  const semesterMeans = useMemo(() => calculateSemesterMeanSeries(courses), [courses]);

  const activePoints = useMemo(() => {
    if (graphMode === 'group') return groupMeans;
    if (graphMode === 'semester') return semesterMeans;
    return totalMeans;
  }, [graphMode, totalMeans, groupMeans, semesterMeans]);

  const chartOptions: Highcharts.Options = useMemo(() => {
    const dateCounts: Record<string, number> = {};

    const seriesData = activePoints.map((pt) => {
      const key = pt.dateRange || String(pt.timestamp);
      const count = dateCounts[key] || 0;
      dateCounts[key] = count + 1;

      // When multiple courses share the exact same date, space them by 4 hours
      // so each point has its own distinct marker position and hover target,
      // while remaining within the same calendar day.
      const offsetMs = count * (4 * 60 * 60 * 1000);

      return {
        x: pt.timestamp + offsetMs,
        realDate: pt.timestamp,
        y: pt.value,
        name: pt.name,
        courseCount: pt.courseCount,
        dateRange: pt.dateRange,
      };
    });

    return {
      chart: {
        type: 'line',
        height: 420,
        backgroundColor: '#ffffff',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        type: 'datetime',
        lineColor: '#000000',
        lineWidth: 2,
        gridLineWidth: 1,
        gridLineColor: '#e5e5e5',
        gridLineDashStyle: 'Dash',
        labels: {
          style: { color: '#000000', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold' },
          formatter: function () {
            return format(new Date(Number(this.value)), 'MM/yy');
          },
        },
      },
      yAxis: {
        title: {
          text: 'WEIGHTED MEAN (GPA)',
          align: 'high',
          offset: 0,
          rotation: 0,
          y: -12,
          style: { color: '#000000', fontSize: '10px', fontWeight: '900', fontFamily: 'monospace' },
        },
        opposite: true,
        min: 1.0,
        max: 5.1,
        tickInterval: 0.5,
        lineColor: '#000000',
        lineWidth: 2,
        gridLineWidth: 1,
        gridLineColor: '#e5e5e5',
        gridLineDashStyle: 'Dash',
        labels: {
          style: { color: '#000000', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold' },
          format: '{value:.1f}',
        },
      },
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 600,
            },
            chartOptions: {
              yAxis: {
                title: {
                  text: undefined,
                },
              },
            },
          },
        ],
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
          const pt = this.point as unknown as {
            name?: string;
            courseCount?: number;
            dateRange?: string;
            realDate?: number;
            y: number;
          };

          const dateStr = pt.dateRange
            ? pt.dateRange
            : format(new Date(Number(pt.realDate || this.x)), 'dd.MM.yyyy');

          return `<div style="padding: 8px; font-family: monospace; border: 2px solid #000000; background: #ffffff; pointer-events: none;">
            <div style="font-size: 9px; font-weight: 900; color: #1d65b8; text-transform: uppercase;">
              // GPA METRIC
            </div>
            <div style="font-size: 18px; font-weight: 900; color: #000000; line-height: 1; margin: 3px 0;">
              ${pt.y.toFixed(2)} <span style="font-size: 10px; font-weight: normal; color: #666666;">/ 5.00</span>
            </div>
            ${pt.name ? `<div style="color: #000000; font-weight: bold; margin-top: 3px; border-top: 1px solid #000000; padding-top: 3px; font-size: 11px;">${pt.name}</div>` : ''}
            <div style="color: #666666; font-size: 9px; margin-top: 2px;">DATE: ${dateStr}</div>
          </div>`;
        },
      },
      plotOptions: {
        series: {
          findNearestPointBy: 'xy',
        },
        line: {
          findNearestPointBy: 'xy',
          marker: {
            enabled: true,
            radius: 4,
            symbol: 'square',
            fillColor: '#1076db',
            lineWidth: 2,
            lineColor: '#000000',
            states: {
              hover: {
                radius: 6,
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
          name:
            graphMode === 'total'
              ? 'TOTAL MEAN'
              : graphMode === 'group'
              ? `GROUP MEAN (BLOCK: ${groupSize})`
              : 'SEMESTER MEAN',
          type: 'line',
          data: seriesData,
          color: '#000000',
          lineWidth: 2.5,
        },
      ],
    };
  }, [activePoints, graphMode, groupSize]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Informative Dispatch Banner */}
      <div className="border-2 border-black bg-black text-white p-3 sm:p-4">
        <div className="font-mono text-[10px] sm:text-xs font-black uppercase text-[#daedff] tracking-wider sm:tracking-widest mb-1">
          // METHODOLOGY // GPA PROGRESSION
        </div>
        <div className="font-mono text-[11px] sm:text-xs leading-relaxed text-neutral-300">
          PAINOTETTU KESKIARVO IS COMPUTED OVER NUMERICAL COURSES (0–5 SCALE) WEIGHTED BY CREDITS.{' '}
          <strong className="text-white">TOTAL</strong> DEPICTS LONGITUDINAL CUMULATIVE AVERAGE.{' '}
          <strong className="text-white">GROUP</strong> PARTITIONS INTO SUB-BLOCKS.{' '}
          <strong className="text-white">SEMESTER</strong> ISOLATES TERMS.
        </div>
      </div>

      {/* Mode Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-2 border-black bg-white p-2.5 sm:p-3">
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setGraphMode('total')}
            className={`border-2 border-black py-1.5 px-2 sm:px-4 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-center transition-none cursor-pointer ${
              graphMode === 'total'
                ? 'bg-[#1076db] text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            <span>TOTAL</span>
            <span className="hidden sm:inline"> MEAN</span>
          </button>
          <button
            type="button"
            onClick={() => setGraphMode('group')}
            className={`border-2 border-black py-1.5 px-2 sm:px-4 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-center transition-none cursor-pointer ${
              graphMode === 'group'
                ? 'bg-[#1076db] text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            <span>GROUP</span>
            <span className="hidden sm:inline"> MEAN</span>
          </button>
          <button
            type="button"
            onClick={() => setGraphMode('semester')}
            className={`border-2 border-black py-1.5 px-2 sm:px-4 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-center transition-none cursor-pointer ${
              graphMode === 'semester'
                ? 'bg-[#1076db] text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            <span>TERM</span>
            <span className="hidden sm:inline"> MEAN</span>
          </button>
        </div>

        {graphMode === 'group' && (
          <div className="flex items-center justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-200">
            <span className="font-mono text-[10px] sm:text-xs font-bold uppercase text-black">BLOCK SIZE:</span>
            <input
              type="number"
              min="2"
              max="20"
              value={groupSize}
              onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value)))}
              className="w-14 border-2 border-black px-1.5 py-0.5 font-mono text-xs font-black text-center text-black focus:outline-none"
            />
            <span className="font-mono text-[10px] sm:text-xs font-bold uppercase text-neutral-600">COURSES</span>
          </div>
        )}
      </div>

      {/* Chart Render Container */}
      <div className="border-2 border-black bg-white p-2 sm:p-4 overflow-hidden">
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      </div>
    </div>
  );
}
