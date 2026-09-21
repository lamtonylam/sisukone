'use client';

import React, { useState, useRef } from 'react';
import { TranscriptData } from '@/types/student';
import { parseSisuPdf } from '@/lib/pdfParser';
import { parseRawTranscriptText } from '@/lib/textParser';
import { sampleTranscript } from '@/lib/sampleTranscript';
import {
  Upload,
  FileText,
  ClipboardPaste,
  ShieldCheck,
  Loader2,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';

interface FileUploaderProps {
  onTranscriptLoaded: (data: TranscriptData) => void;
  currentStudyStart?: string;
}

export function FileUploader({
  onTranscriptLoaded,
  currentStudyStart = '2022-08-01',
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('PARSING TRANSCRIPT...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Text Paste Modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const processFile = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setErrorMessage('INVALID FILE: MUST BE A VALID SISU PDF (OPINTOSUORITUSOTE).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingText('EXECUTING CLIENT-SIDE PDF PARSE...');

    try {
      const data = await parseSisuPdf(file);

      if (data.courses.length === 0) {
        throw new Error(
          'NO COURSES DETECTED IN PDF. TRY "PASTE TEXT" TO IMPORT ROWS DIRECTLY.'
        );
      }

      onTranscriptLoaded(data);
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const msg = err instanceof Error ? err.message : 'FAILED TO PARSE PDF DOCUMENT.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    try {
      const result = parseRawTranscriptText(pastedText);
      if (result.courses.length === 0) {
        throw new Error('No completed course records recognized in pasted payload.');
      }

      onTranscriptLoaded({
        profile: {
          studentName: result.studentName || 'Student',
          studentNumber: result.studentNumber,
          degreeProgramme: result.degreeProgramme,
          studyStartDate: result.studyStartDate || currentStudyStart,
          targetCredits: 180,
          nominalPace: 60,
        },
        courses: result.courses,
      });

      setIsPasteModalOpen(false);
      setPastedText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse raw text.';
      alert(msg);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Upload Zone Brutalist Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 sm:border-4 border-black p-5 sm:p-12 text-center transition-none ${
          isDragging
            ? 'bg-[#daedff] text-black'
            : 'bg-white text-black'
        } ${isLoading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        <div className="mx-auto flex max-w-xl flex-col items-center">
          {/* Brutalist Icon Box */}
          <div className="mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center border-2 border-black bg-black text-[#daedff]">
            {isLoading ? (
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[#daedff]" />
            ) : (
              <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
            )}
          </div>

          <div className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-[#1076db] mb-1">
            // DOCUMENT INGESTION
          </div>

          <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-black">
            {isLoading ? loadingText : 'DROP SISU PDF TRANSCRIPT HERE'}
          </h3>

          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-neutral-600 max-w-md">
            OFFICIAL TRANSCRIPT OF RECORDS (OPINTOSUORITUSOTE) EXPORTED DIRECTLY FROM SISU. 100% IN-BROWSER PARSING.
          </p>

          {/* Action Buttons - Full-width stacked on mobile, row on desktop */}
          <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 bg-[#1076db] text-white border-2 border-black h-11 sm:h-auto px-5 sm:px-6 py-2.5 sm:py-3.5 font-black text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-none cursor-pointer"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>SELECT PDF TRANSCRIPT</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 bg-white text-black border-2 border-black h-11 sm:h-auto px-5 sm:px-6 py-2.5 sm:py-3.5 font-bold text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-none cursor-pointer"
            >
              <ClipboardPaste className="h-4 w-4 shrink-0" />
              <span>PASTE TEXT</span>
            </button>

            <button
              type="button"
              onClick={() => onTranscriptLoaded(sampleTranscript)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 bg-black text-white border-2 border-black h-11 sm:h-auto px-5 sm:px-6 py-2.5 sm:py-3.5 font-bold text-xs uppercase tracking-wider hover:bg-[#1076db] hover:text-white hover:border-black transition-none cursor-pointer"
            >
              <span>LOAD SAMPLE DEMO</span>
            </button>
          </div>

          {/* Privacy Security Badge - High-Contrast #daedff on Black (17.4:1 contrast) */}
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 border-2 border-black bg-black text-[#daedff] px-3.5 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#daedff] stroke-[2.5]" />
            <span>PRIVATE BY DEFAULT</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="border-2 border-black bg-black text-[#daedff] p-3 sm:p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#daedff]" />
          <div className="font-mono text-xs">
            <p className="font-black uppercase tracking-wider text-white">// PARSING NOTICE</p>
            <p className="mt-1 text-[#daedff] font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Sisu Export Guide Box */}
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-black text-[#daedff] shrink-0">
            <HelpCircle className="h-4 w-4 text-[#daedff]" />
          </div>
          <div className="space-y-2 sm:space-y-3 flex-1 w-full">
            <div className="flex items-center gap-2">
              <span className="bg-[#1076db] text-white font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-0.5">
                INSTRUCTION PROTOCOL
              </span>
              <span className="font-black uppercase text-xs sm:text-sm tracking-tight text-black truncate">
                HOW TO DOWNLOAD FROM SISU
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-1">
              <div className="border-2 border-black p-2.5 sm:p-3 bg-white">
                <span className="font-mono text-xl sm:text-2xl font-black text-[#1076db] block mb-0.5">01</span>
                <p className="font-mono text-[11px] sm:text-xs text-neutral-800 uppercase">
                  LOG IN TO YOUR SISU PORTAL (<span className="text-black font-bold">sisu.helsinki.fi</span>, <span className="text-black font-bold">sisu.aalto.fi</span>).
                </p>
              </div>

              <div className="border-2 border-black p-2.5 sm:p-3 bg-white">
                <span className="font-mono text-xl sm:text-2xl font-black text-[#1076db] block mb-0.5">02</span>
                <p className="font-mono text-[11px] sm:text-xs text-neutral-800 uppercase">
                  GO TO <strong>MY PROFILE</strong> &rarr; <strong>COMPLETED CREDITS</strong> (OPINTOSUORITUKSET).
                </p>
              </div>

              <div className="border-2 border-black p-2.5 sm:p-3 bg-white">
                <span className="font-mono text-xl sm:text-2xl font-black text-[#1076db] block mb-0.5">03</span>
                <p className="font-mono text-[11px] sm:text-xs text-neutral-800 uppercase">
                  CLICK <strong>PRINT TRANSCRIPT OF RECORDS</strong> (TULOSTA OPINTOSUORITUSOTE).
                </p>
              </div>

              <div className="border-2 border-black p-2.5 sm:p-3 bg-white">
                <span className="font-mono text-xl sm:text-2xl font-black text-[#1076db] block mb-0.5">04</span>
                <p className="font-mono text-[11px] sm:text-xs text-neutral-800 uppercase">
                  DROP OR SELECT THE RESULTING PDF DIRECTLY INTO SISUKONE FOR IMMEDIATE ANALYSIS.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paste Text Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="relative w-full max-w-2xl border-2 sm:border-4 border-black bg-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-black mb-3 sm:mb-4">
              <div>
                <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase text-[#daedff] tracking-widest bg-black px-1.5 py-0.5">
                  // RAW INPUT BUFFER
                </span>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-black mt-1">
                  PASTE SISU TRANSCRIPT DATA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="border-2 border-black p-1 hover:bg-[#1076db] hover:text-white transition-none cursor-pointer"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <p className="font-mono text-[11px] sm:text-xs text-neutral-600 uppercase mb-3">
              COPY AND PASTE ROWS DIRECTLY FROM SISU COMPLETED COURSES TABLE:
            </p>

            <form onSubmit={handlePasteSubmit} className="space-y-3 sm:space-y-4">
              <textarea
                rows={7}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="TKT10001 Ohjelmoinnin perusteet 5 op 5 15.10.2021&#10;TKT10002 Ohjelmoinnin jatkokurssi 5 op 4 18.12.2021..."
                className="w-full border-2 border-black p-2.5 sm:p-3 font-mono text-xs text-black focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="border-2 border-black bg-white px-4 sm:px-5 py-2 sm:py-2.5 font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-none cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="border-2 border-black bg-[#1076db] px-5 sm:px-6 py-2 sm:py-2.5 font-black text-xs uppercase tracking-wider text-white hover:bg-black hover:text-white transition-none cursor-pointer"
                >
                  PARSE BUFFER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
