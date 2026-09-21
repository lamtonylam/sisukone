'use client';

import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Course } from '@/types/student';
import { calculateGradeDistribution } from '@/lib/chartCalculations';

interface GradeDistributionProps {
  courses: Course[];
}

export function GradeDistribution({ courses }: GradeDistributionProps) {
  const distribution = useMemo(() => calculateGradeDistribution(courses), [courses]);

  const chartOptions: Highcharts.Options = useMemo(() => {
    const categories = distribution.map((d) => `G${d.grade}`);
    const counts = distribution.map((d) => d.count);

    return {
      chart: {
        type: 'column',
        height: 280,
        backgroundColor: '#ffffff',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: '// GRADE DISTRIBUTION // ALL COURSES',
        align: 'left',
        style: {
          fontSize: '11px',
          fontWeight: '900',
          fontFamily: 'monospace',
          color: '#000000',
        },
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        categories,
        crosshair: false,
        lineColor: '#000000',
        lineWidth: 2,
        labels: {
          style: {
            color: '#000000',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
        },
      },
      yAxis: {
        min: 0,
        lineColor: '#000000',
        lineWidth: 2,
        title: {
          text: 'COURSES',
          style: {
            color: '#000000',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
        },
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
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
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
          const idx = this.point.index;
          const d = distribution[idx];
          return `<div style="padding: 8px; font-family: monospace; border: 2px solid #000000; background: #ffffff; pointer-events: none;">
            <div style="font-size: 9px; font-weight: 900; color: #1d65b8; text-transform: uppercase;">
              // DISTRIBUTION METRIC
            </div>
            <div style="font-size: 13px; font-weight: 900; color: #000000; margin: 2px 0 4px 0;">
              GRADE ${d.grade}
            </div>
            <div style="font-size: 10px; line-height: 1.4; color: #000000;">
              <div>COUNT: <strong>${d.count}</strong> (${d.percentage}%)</div>
              <div>CREDITS: <strong>${d.credits} OP</strong></div>
            </div>
          </div>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 0,
          pointPadding: 0.1,
          borderWidth: 2,
          borderColor: '#000000',
          colorByPoint: true,
          colors: ['#1076db', '#1d65b8', '#000000', '#262626', '#525252', '#000000'],
        },
      },
      legend: {
        enabled: false,
      },
      series: [
        {
          name: 'COURSES',
          type: 'column',
          data: counts,
        },
      ],
    };
  }, [distribution]);

  return (
    <div className="border-2 border-black bg-white p-2 sm:p-4 overflow-hidden">
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
}
