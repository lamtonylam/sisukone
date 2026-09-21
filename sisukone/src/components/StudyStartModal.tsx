'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile } from '@/types/student';
import { Calendar, Check, X, ChevronRight } from 'lucide-react';

interface StudyStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSave: (updatedProfile: StudentProfile) => void;
}

const AVAILABLE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

const DEGREE_PRESETS = [
  { label: 'BACHELOR', credits: 180, years: '3 YRS' },
  { label: 'MASTER', credits: 120, years: '2 YRS' },
  { label: 'COMBINED', credits: 300, years: '5 YRS' },
];

export function StudyStartModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: StudyStartModalProps) {
  const [startDate, setStartDate] = useState(profile.studyStartDate || '2022-08-01');
  const [targetCredits, setTargetCredits] = useState(profile.targetCredits || 180);
  const [nominalPace, setNominalPace] = useState(profile.nominalPace || 60);
  const [degreeProgramme, setDegreeProgramme] = useState(profile.degreeProgramme || '');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartDate(profile.studyStartDate || '2022-08-01');
      setTargetCredits(profile.targetCredits || 180);
      setNominalPace(profile.nominalPace || 60);
      setDegreeProgramme(profile.degreeProgramme || '');
      setIsCustomDateOpen(false);
    }
  }, [isOpen, profile]);

  // Derive active semester & year from current startDate
  const { currentYear, currentTerm, isStandardDate } = useMemo(() => {
    const parts = (startDate || '2022-08-01').split('-');
    const year = parseInt(parts[0], 10) || 2022;
    const month = parseInt(parts[1], 10) || 8;
    const day = parseInt(parts[2], 10) || 1;

    const isFall = month === 8 && day === 1;
    const isSpring = month === 1 && day === 1;

    return {
      currentYear: year,
      currentTerm: month >= 7 ? 'FALL' : 'SPRING',
      isStandardDate: isFall || isSpring,
    };
  }, [startDate]);

  if (!isOpen) return null;

  const handleSelectTerm = (term: 'FALL' | 'SPRING') => {
    const monthDay = term === 'FALL' ? '08-01' : '01-01';
    setStartDate(`${currentYear}-${monthDay}`);
  };

  const handleSelectYear = (year: number) => {
    const monthDay = currentTerm === 'FALL' ? '08-01' : '01-01';
    setStartDate(`${year}-${monthDay}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...profile,
      studyStartDate: startDate,
      targetCredits: Number(targetCredits) || 180,
      nominalPace: Number(nominalPace) || 60,
      degreeProgramme,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4">
      <div className="relative w-full sm:max-w-xl border-t-4 sm:border-4 border-black bg-white max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-none">
        {/* Inverted Black Title Bar */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-black bg-black text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-2 border-white bg-[#1076db] text-white shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 truncate">
              <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase text-[#daedff] tracking-widest truncate">
                // CONFIGURATION BUFFER
              </div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white truncate">
                STUDY START &amp; DEGREE TARGET
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-white p-1 text-white hover:bg-[#1076db] hover:text-white hover:border-[#1076db] transition-none cursor-pointer shrink-0 ml-2"
            title="Close modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* SECTION 1: UNIVERSITY STARTING PERIOD */}
          <div className="border-2 border-black p-3 sm:p-4 bg-white space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <label className="font-mono text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-[#1076db]" />
                <span>STARTING PERIOD</span>
              </label>
              <div className="font-mono text-[11px] font-bold bg-black text-white px-2 py-0.5">
                {startDate} ({currentTerm} {currentYear})
              </div>
            </div>

            {/* Term Picker: 2 Large Touch-Friendly Buttons */}
            <div>
              <div className="font-mono text-[10px] font-black uppercase text-neutral-500 mb-1.5">
                01 // SELECT SEMESTER TERM
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTerm('FALL')}
                  className={`h-11 sm:h-12 border-2 border-black px-3 font-mono text-xs sm:text-sm font-black uppercase flex items-center justify-center gap-2 transition-none cursor-pointer ${
                    currentTerm === 'FALL' && isStandardDate
                      ? 'bg-[#1076db] text-white shadow-none'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <span>FALL (SYKSY)</span>
                  <span className="text-[10px] font-normal opacity-80">[AUG 01]</span>
                  {currentTerm === 'FALL' && isStandardDate && (
                    <Check className="h-4 w-4 stroke-[3]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTerm('SPRING')}
                  className={`h-11 sm:h-12 border-2 border-black px-3 font-mono text-xs sm:text-sm font-black uppercase flex items-center justify-center gap-2 transition-none cursor-pointer ${
                    currentTerm === 'SPRING' && isStandardDate
                      ? 'bg-[#1076db] text-white shadow-none'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <span>SPRING (KEVÄT)</span>
                  <span className="text-[10px] font-normal opacity-80">[JAN 01]</span>
                  {currentTerm === 'SPRING' && isStandardDate && (
                    <Check className="h-4 w-4 stroke-[3]" />
                  )}
                </button>
              </div>
            </div>

            {/* Year Picker: High-Contrast Touch Grid */}
            <div>
              <div className="font-mono text-[10px] font-black uppercase text-neutral-500 mb-1.5">
                02 // SELECT ACADEMIC YEAR
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {AVAILABLE_YEARS.map((year) => {
                  const isSelected = currentYear === year && isStandardDate;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleSelectYear(year)}
                      className={`h-10 sm:h-11 border-2 border-black font-mono text-xs sm:text-sm font-black transition-none cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#1076db] text-white'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Exact Date Collapsible Drawer */}
            <div className="pt-2 border-t-2 border-black">
              {!isCustomDateOpen ? (
                <button
                  type="button"
                  onClick={() => setIsCustomDateOpen(true)}
                  className="font-mono text-[11px] font-bold text-neutral-700 hover:text-black flex items-center gap-1 cursor-pointer underline uppercase"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-[#1076db]" />
                  <span>CUSTOM / NON-STANDARD START DATE?</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-neutral-100 p-2.5 border-2 border-black">
                  <span className="font-mono text-[11px] font-black uppercase text-black shrink-0">
                    EXACT DATE:
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border-2 border-black px-2.5 py-1.5 font-mono text-xs font-bold text-black bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomDateOpen(false)}
                    className="font-mono text-[10px] font-bold text-neutral-500 hover:text-black uppercase underline shrink-0 sm:ml-2"
                  >
                    HIDE
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: TARGET DEGREE GOAL */}
          <div className="border-2 border-black p-3 sm:p-4 bg-white space-y-2.5">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <label className="font-mono text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-[#1076db]" />
                <span>DEGREE GOAL LINE</span>
              </label>
              <div className="font-mono text-[11px] font-bold text-neutral-600">
                {targetCredits} ECTS TARGET
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DEGREE_PRESETS.map((preset) => {
                const isSelected = targetCredits === preset.credits;
                return (
                  <button
                    key={preset.credits}
                    type="button"
                    onClick={() => setTargetCredits(preset.credits)}
                    className={`border-2 border-black p-2 sm:p-3 text-center transition-none cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    <div className="font-mono text-[10px] sm:text-xs font-black truncate w-full">
                      {preset.label}
                    </div>
                    <div className={`font-mono text-xs sm:text-base font-black ${isSelected ? 'text-[#1076db]' : 'text-black'}`}>
                      {preset.credits} OP
                    </div>
                    <div className="font-mono text-[9px] sm:text-[10px] text-neutral-400">
                      {preset.years}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: METADATA & NOMINAL PACE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-black mb-1">
                DEGREE PROGRAMME (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. TIETOJENKÄSITTELYTIEDE"
                value={degreeProgramme}
                onChange={(e) => setDegreeProgramme(e.target.value)}
                className="w-full border-2 border-black py-2 px-3 font-mono text-xs font-bold text-black uppercase focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-black mb-1">
                ANNUAL TARGET PACE (OP/YR)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={nominalPace}
                onChange={(e) => setNominalPace(Number(e.target.value))}
                className="w-full border-2 border-black py-2 px-3 font-mono text-xs font-black text-black focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Fixed Bottom Action Bar */}
        <div className="p-3 sm:p-4 border-t-2 border-black bg-white flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none border-2 border-black bg-white h-11 sm:h-auto px-4 sm:px-6 py-2.5 font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-none cursor-pointer text-center"
          >
            CANCEL
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-1 sm:flex-none border-2 border-black bg-[#1076db] h-11 sm:h-auto px-5 sm:px-7 py-2.5 font-black text-xs uppercase tracking-wider text-white hover:bg-black hover:text-white transition-none cursor-pointer text-center"
          >
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}
