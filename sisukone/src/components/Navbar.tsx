'use client';

import React, { useRef, useState } from 'react';
import { TranscriptData } from '@/types/student';
import { sampleTranscript } from '@/lib/sampleTranscript';
import { parseSisuPdf } from '@/lib/pdfParser';
import {
  Download,
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  transcript: TranscriptData | null;
  onUpdateTranscript: (data: TranscriptData | null) => void;
  anonymize: boolean;
  onToggleAnonymize: () => void;
  onOpenStudyStartModal: () => void;
}

export function Navbar({
  transcript,
  onUpdateTranscript,
  anonymize,
  onToggleAnonymize,
  onOpenStudyStartModal,
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);

  const handleExportJson = () => {
    if (!transcript) return;
    const dataStr = JSON.stringify(transcript, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sisukone-transcript-${transcript.profile.studyStartDate || 'export'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        setIsImporting(true);
        const data = await parseSisuPdf(file);
        if (data.courses.length === 0) {
          alert('No courses detected in PDF. Try using the main uploader or paste text.');
        } else {
          onUpdateTranscript(data);
        }
      } catch (err) {
        console.error('Error importing PDF:', err);
        alert(err instanceof Error ? err.message : 'Failed to parse Sisu PDF.');
      } finally {
        setIsImporting(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.courses && Array.isArray(json.courses)) {
            onUpdateTranscript(json);
          } else {
            alert('Invalid transcript JSON format.');
          }
        } catch (err) {
          console.error('Error importing JSON:', err);
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleLoadSample = () => {
    onUpdateTranscript(sampleTranscript);
  };

  const handleReset = () => {
    if (window.confirm('Clear all loaded course and transcript data?')) {
      onUpdateTranscript(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-black text-white border-b-2 border-black w-full">
      {/* Editorial Ticker Top Bar - Single Line on Mobile */}
      <div className="bg-[#1076db] text-white px-3 sm:px-6 py-1 border-b-2 border-black flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold tracking-wider sm:tracking-widest uppercase whitespace-nowrap overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="inline-block w-1.5 h-1.5 bg-white shrink-0" />
          <span className="sm:hidden truncate">ACADEMIC INTELLIGENCE // 100% IN-BROWSER</span>
          <span className="hidden sm:inline">ACADEMIC INTELLIGENCE ENGINE // 100% IN-BROWSER</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[10px] shrink-0">
          <span>LOCAL ENGINE</span>
        </div>
      </div>

      {/* Main Full-Width Black Navbar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-3 gap-2">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={handleReset}
          className="flex flex-col justify-center text-left group focus:outline-none cursor-pointer shrink-0"
          title="Reset to home"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white leading-none">
              SISU<span className="text-[#1076db]">KONE</span>
            </span>
          </div>
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider hidden lg:block leading-tight mt-0.5">
            Client-Side Degree Analytics &amp; Progression Graph
          </p>
        </button>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {transcript && (
            <>
              {/* Study Start Settings */}
              <button
                type="button"
                onClick={onOpenStudyStartModal}
                className="hidden lg:inline-flex h-8 sm:h-9 items-center gap-1.5 border-2 border-white bg-black px-2.5 sm:px-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1076db] hover:text-white hover:border-[#1076db] transition-none cursor-pointer whitespace-nowrap"
                title="Configure starting date and pace"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>START: {transcript.profile.studyStartDate}</span>
              </button>

              {/* Privacy Anonymize Mode */}
              <button
                type="button"
                onClick={onToggleAnonymize}
                className={`inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 border-2 px-2.5 sm:px-3 font-mono text-xs font-bold uppercase tracking-wider transition-none cursor-pointer whitespace-nowrap ${
                  anonymize
                    ? 'border-[#1076db] bg-[#1076db] text-white'
                    : 'border-neutral-700 bg-black text-white hover:border-white'
                }`}
                title="Toggle privacy anonymization"
              >
                {anonymize ? (
                  <EyeOff className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="hidden sm:inline">{anonymize ? 'MASK ON' : 'ANONYMIZE'}</span>
              </button>

              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 border-2 border-white bg-white px-2.5 sm:px-3 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-[#1076db] hover:border-[#1076db] hover:text-white transition-none cursor-pointer whitespace-nowrap"
                title="Export transcript JSON"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">EXPORT</span>
              </button>
            </>
          )}

          {/* Hidden File Input for PDF / JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".pdf,.json,application/pdf,application/json"
            className="hidden"
          />

          {/* Import PDF */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 border-2 border-neutral-700 bg-black px-2.5 sm:px-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:border-white transition-none cursor-pointer whitespace-nowrap disabled:opacity-50"
            title="Import Sisu PDF or JSON transcript"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>{isImporting ? 'PARSING...' : 'IMPORT PDF'}</span>
          </button>

          {!transcript ? (
            /* Load Sample Demo */
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 bg-[#1076db] text-white border-2 border-[#1076db] px-2.5 sm:px-4 font-black text-xs uppercase tracking-wider hover:bg-black hover:border-white hover:text-white transition-none cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>SAMPLE</span>
              <span className="hidden sm:inline">DEMO</span>
            </button>
          ) : (
            /* Reset Transcript */
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 border-2 border-neutral-700 bg-black px-2.5 sm:px-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 hover:border-[#1076db] hover:text-[#1076db] transition-none cursor-pointer whitespace-nowrap"
              title="Clear transcript"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">CLEAR</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
