import React, { useState, useEffect } from 'react';
import { TranscriptData } from '@/types/student';
import { Navbar } from '@/components/Navbar';
import { StatsHeader } from '@/components/StatsHeader';
import { StudyStartModal } from '@/components/StudyStartModal';
import { FileUploader } from '@/components/FileUploader';
import { StudentCreditGraph } from '@/components/Charts/StudentCreditGraph';
import { StudentGradeGraph } from '@/components/Charts/StudentGradeGraph';
import { GradeDistribution } from '@/components/Charts/GradeDistribution';
import { CourseTable } from '@/components/CourseTable/CourseTable';
import {
  LineChart,
  BarChart3,
  Table as TableIcon,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'sisukone_transcript_data_v1';

export default function App() {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [anonymize, setAnonymize] = useState(false);
  const [activeTab, setActiveTab] = useState<'credit' | 'grade' | 'courses'>('credit');
  const [isStudyStartModalOpen, setIsStudyStartModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted transcript from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.courses && Array.isArray(parsed.courses)) {
          setTranscript(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading saved transcript from storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist transcript changes
  const handleUpdateTranscript = (data: TranscriptData | null) => {
    setTranscript(data);
    try {
      if (data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving transcript to storage:', e);
    }
  };

  // Called when a user newly loads a transcript (via upload, paste, or demo)
  const handleTranscriptLoaded = (data: TranscriptData) => {
    handleUpdateTranscript(data);
  };

  const handleUpdateProfile = (updatedProfile: TranscriptData['profile']) => {
    if (!transcript) return;
    const updated = {
      ...transcript,
      profile: updatedProfile,
    };
    handleUpdateTranscript(updated);
  };

  const handleUpdateCourses = (updatedCourses: TranscriptData['courses']) => {
    if (!transcript) return;
    const updated = {
      ...transcript,
      courses: updatedCourses,
    };
    handleUpdateTranscript(updated);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-black border-t-[#1076db] animate-spin" />
          <span className="font-mono text-xs font-black uppercase tracking-widest text-black">
            INITIALIZING BUFFER...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-black overflow-x-hidden">
      {/* Navigation Header */}
      <Navbar
        transcript={transcript}
        onUpdateTranscript={handleUpdateTranscript}
        anonymize={anonymize}
        onToggleAnonymize={() => setAnonymize(!anonymize)}
        onOpenStudyStartModal={() => setIsStudyStartModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-8">
        {!transcript ? (
          /* Empty State: Loud Editorial Hero + Upload */
          <div className="space-y-6 sm:space-y-10 py-2 sm:py-4">
            {/* Editorial Headline Mixing Sans and Italic Serif */}
            <div className="border-b-2 border-black pb-6 sm:pb-8">
              <div className="font-mono text-[10px] sm:text-xs font-black uppercase text-[#1076db] tracking-wider sm:tracking-widest mb-2 sm:mb-3 flex items-center gap-1.5 truncate">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-[#1076db] text-[#1076db] shrink-0" />
                <span className="truncate">ACADEMIC INTELLIGENCE ENGINE // EDITION 2026</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-black leading-[0.92] break-words">
                YOUR <span className="font-serif italic font-normal text-[#1076db]">Degree,</span><br className="sm:hidden" />
                {' '}UNFILTERED.
              </h1>

              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2 border-black">
                <p className="font-mono text-xs sm:text-sm uppercase tracking-wider text-black leading-relaxed max-w-3xl">
                  TRANSFORM OFFICIAL SISU UNIVERSITY TRANSCRIPTS INTO INTERACTIVE, CLIENT-SIDE CREDIT PROGRESSION VELOCITY CURVES AND LONGITUDINAL GRADE ARCHIVES. ZERO SERVER STORAGE.
                </p>
              </div>
            </div>

            {/* Ingestion Dropzone */}
            <div className="max-w-4xl mx-auto">
              <FileUploader
                onTranscriptLoaded={handleTranscriptLoaded}
                currentStudyStart="2022-08-01"
              />
            </div>
          </div>
        ) : (
          /* Active Dashboard View */
          <div className="space-y-6 sm:space-y-8">
            {/* KPI Statistics Overview Header */}
            <StatsHeader
              transcript={transcript}
              anonymize={anonymize}
              onOpenStudyStartModal={() => setIsStudyStartModalOpen(true)}
            />

            {/* Navigation Tabs - Horizontally scrollable on mobile */}
            <div className="border-b-2 border-black pb-0">
              <nav className="-mb-[2px] flex overflow-x-auto no-scrollbar gap-1 sm:gap-2 pb-0" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('credit')}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 border-2 border-black py-2.5 sm:py-3 px-3 sm:px-5 font-mono text-xs font-black uppercase tracking-wider transition-none cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'credit'
                      ? 'bg-[#1076db] text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <LineChart className="h-4 w-4 shrink-0" />
                  <span>CREDITS</span>
                  <span className="hidden sm:inline">ACCUMULATION</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('grade')}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 border-2 border-black py-2.5 sm:py-3 px-3 sm:px-5 font-mono text-xs font-black uppercase tracking-wider transition-none cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'grade'
                      ? 'bg-[#1076db] text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  <span>GRADES</span>
                  <span className="hidden sm:inline">TRAJECTORY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('courses')}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 border-2 border-black py-2.5 sm:py-3 px-3 sm:px-5 font-mono text-xs font-black uppercase tracking-wider transition-none cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'courses'
                      ? 'bg-[#1076db] text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <TableIcon className="h-4 w-4 shrink-0" />
                  <span>COURSES</span>
                  <span className="font-mono text-[10px]">({transcript.courses.length})</span>
                </button>
              </nav>
            </div>

            {/* Tab Views */}
            {activeTab === 'credit' && (
              <div className="space-y-6">
                <StudentCreditGraph transcript={transcript} />
              </div>
            )}

            {activeTab === 'grade' && (
              <div className="space-y-6">
                <StudentGradeGraph transcript={transcript} />
                <GradeDistribution courses={transcript.courses} />
              </div>
            )}

            {activeTab === 'courses' && (
              <CourseTable
                courses={transcript.courses}
                onUpdateCourses={handleUpdateCourses}
              />
            )}
          </div>
        )}
      </main>

      {/* Verge Full-Width Black Inverted Footer */}
      <footer className="mt-auto border-t-2 border-black bg-black text-white py-4 sm:py-6">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-center sm:text-left">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-black uppercase tracking-tight text-white text-sm sm:text-base">
              SISU<span className="text-[#daedff]">KONE</span>
            </span>
            <span className="text-neutral-500">//</span>
            <span className="uppercase text-neutral-400 text-[10px] sm:text-xs">
              DEGREE ANALYTICS
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-[#daedff] font-bold uppercase tracking-wider border border-[#daedff] px-2.5 py-1 text-[10px] sm:text-xs">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#daedff]" />
            <span>100% LOCAL PRIVACY ENCLAVE</span>
          </div>
        </div>
      </footer>

      {/* Study Start Settings Modal */}
      {transcript && (
        <StudyStartModal
          isOpen={isStudyStartModalOpen}
          onClose={() => setIsStudyStartModalOpen(false)}
          profile={transcript.profile}
          onSave={handleUpdateProfile}
        />
      )}
    </div>
  );
}
