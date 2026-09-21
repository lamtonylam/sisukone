'use client';

import React from 'react';
import { TranscriptData } from '@/types/student';
import {
  calculateCumulativeCredits,
  calculateWeightedGpa,
  calculateProjectedGraduation,
} from '@/lib/chartCalculations';
import { Calendar, FileDown, Loader2 } from 'lucide-react';

interface StatsHeaderProps {
  transcript: TranscriptData;
  anonymize: boolean;
  onOpenStudyStartModal: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
}

export function StatsHeader({
  transcript,
  anonymize,
  onOpenStudyStartModal,
  onExportPdf,
  isExportingPdf,
}: StatsHeaderProps) {
  const { profile, courses } = transcript;
  const { totalCredits } = calculateCumulativeCredits(courses);
  const weightedGpa = calculateWeightedGpa(courses);
  const targetCredits = profile.targetCredits || 180;
  const progressPercent = Math.min(100, Math.round((totalCredits / targetCredits) * 100));

  const graduationInfo = calculateProjectedGraduation(profile, totalCredits);

  const displayName = anonymize
    ? 'ANONYMOUS CANDIDATE'
    : profile.studentName
      ? profile.studentName.toUpperCase()
      : 'STUDENT';
  const displayStudentNum = anonymize ? '••••••••' : profile.studentNumber || '—';

  return (
    <div className="border-2 border-black bg-white">
      {/* Dossier Header Bar (Inverted Black Section) */}
      <div className="bg-black text-white p-3.5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-black">
        <div className="min-w-0">
          <div className="font-mono text-[10px] sm:text-xs font-black text-[#daedff] tracking-wider sm:tracking-widest uppercase mb-1">
            // DOSSIER // ACADEMIC RECORD
          </div>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase text-white truncate">
            {displayName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-0.5 font-mono text-[10px] sm:text-xs text-neutral-400">
            <span>
              ID: <strong className="text-white">{displayStudentNum}</strong>
            </span>
            {profile.degreeProgramme && (
              <>
                <span>//</span>
                <span className="text-neutral-200 font-semibold truncate max-w-[200px] sm:max-w-none">
                  {profile.degreeProgramme.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls: Export PDF and Start Date Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center justify-center gap-1.5 border-2 border-[#1076db] bg-[#1076db] h-10 sm:h-auto px-3.5 py-1.5 sm:px-4 sm:py-2 font-mono text-xs font-black uppercase tracking-wider text-white hover:bg-black hover:border-white transition-none cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              title="Download complete academic PDF dossier"
            >
              {isExportingPdf ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{isExportingPdf ? 'GENERATING...' : 'EXPORT PDF'}</span>
            </button>
          )}

          {/* Start Date Configuration Badge */}
          <button
            type="button"
            onClick={onOpenStudyStartModal}
            className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 border-2 border-white bg-white h-10 sm:h-auto px-3.5 py-1.5 sm:px-4 sm:py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-[#1076db] hover:border-[#1076db] hover:text-white transition-none cursor-pointer whitespace-nowrap shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>
                START: <strong>{profile.studyStartDate}</strong>
              </span>
            </div>
            <span className="font-black bg-black text-white px-2 py-0.5 text-[10px] sm:bg-transparent sm:text-black sm:p-0 sm:underline">
              [CHANGE]
            </span>
          </button>
        </div>
      </div>

      {/* KPI 4-Quadrant Grid on mobile (2x2), 4-column on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Credits */}
        <div className="p-3 sm:p-5 flex flex-col justify-between bg-white border-b-2 lg:border-b-0 border-r-2 border-black">
          <div>
            <div className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest text-[#1076db] truncate">
              // 01. CREDITS
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter tabular-nums text-black leading-none">
                {totalCredits}
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-neutral-600">
                / {targetCredits} OP
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-3 sm:h-4 w-full border-2 border-black bg-white p-[1px] sm:p-[2px]">
              <div
                className="h-full bg-[#1076db] transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] sm:text-[10px] font-bold text-neutral-500 uppercase">
              <span>{progressPercent}%</span>
              <span>{Math.max(0, targetCredits - totalCredits)} OP LEFT</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Weighted GPA */}
        <div className="p-3 sm:p-5 flex flex-col justify-between bg-white border-b-2 lg:border-b-0 lg:border-r-2 border-black">
          <div>
            <div className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest text-[#1076db] truncate">
              // 02. GPA (KA)
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter tabular-nums text-black leading-none">
                {weightedGpa !== null ? weightedGpa.toFixed(2) : '—'}
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-neutral-600">
                / 5.00
              </span>
            </div>
          </div>
          <div className="mt-3 border-t-2 border-black pt-1.5 font-mono text-[9px] sm:text-[10px] text-neutral-600 uppercase tracking-wider truncate">
            CREDITS WEIGHTED
          </div>
        </div>

        {/* KPI 3: Annual Velocity */}
        <div className="p-3 sm:p-5 flex flex-col justify-between bg-white border-r-2 border-black">
          <div>
            <div className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest text-[#1076db] truncate">
              // 03. ANNUAL PACE
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter tabular-nums text-black leading-none">
                {graduationInfo?.paceCreditsPerYear ?? '—'}
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-neutral-600">OP/YR</span>
            </div>
          </div>
          <div className="mt-3 border-t-2 border-black pt-1.5 font-mono text-[9px] sm:text-[10px] text-neutral-600 uppercase tracking-wider truncate">
            GOAL: {profile.nominalPace || 60} OP/YR
          </div>
        </div>

        {/* KPI 4: Est. Graduation */}
        <div className="p-3 sm:p-5 flex flex-col justify-between bg-white">
          <div>
            <div className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest text-[#1076db] truncate">
              // 04. GRADUATION
            </div>
            <div className="mt-1.5">
              <span className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase text-black leading-none truncate block">
                {graduationInfo?.projectedDate || '—'}
              </span>
            </div>
          </div>
          <div className="mt-3 border-t-2 border-black pt-1.5 font-mono text-[9px] sm:text-[10px] text-neutral-600 uppercase tracking-wider truncate">
            EXTRAPOLATED
          </div>
        </div>
      </div>
    </div>
  );
}
