'use client';

import React, { useState, useMemo } from 'react';
import { Course } from '@/types/student';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  BookOpen,
} from 'lucide-react';

interface CourseTableProps {
  courses: Course[];
  onUpdateCourses: (updatedCourses: Course[]) => void;
}

export function CourseTable({ courses, onUpdateCourses }: CourseTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Course>>({});

  // Add course modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    code: '',
    name: '',
    credits: 5,
    grade: '5',
    date: new Date().toISOString().split('T')[0],
    passed: true,
  });

  // Filtered & Sorted Courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        const matchesSearch =
          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.name.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedGradeFilter === 'all') return true;
        if (selectedGradeFilter === 'pass') {
          return ['HYV', 'PASS', 'PASSED', 'GODKÄND', 'G', 'HT', 'TT', 'S'].includes(
            c.grade.toUpperCase()
          );
        }
        return c.grade === selectedGradeFilter;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [courses, searchTerm, selectedGradeFilter]);

  const totalFilteredCredits = useMemo(() => {
    return filteredCourses.reduce((acc, c) => acc + (c.passed ? c.credits : 0), 0);
  }, [filteredCourses]);

  const handleStartEdit = (course: Course) => {
    setEditingCourseId(course.id);
    setEditForm({ ...course });
  };

  const handleSaveEdit = () => {
    if (!editingCourseId) return;
    const updated = courses.map((c) =>
      c.id === editingCourseId
        ? ({
            ...c,
            ...editForm,
            credits: Number(editForm.credits) || c.credits,
            passed: editForm.passed !== false,
          } as Course)
        : c
    );
    onUpdateCourses(updated);
    setEditingCourseId(null);
    setEditForm({});
  };

  const handleDeleteCourse = (id: string) => {
    if (window.confirm('Delete this course entry from records?')) {
      onUpdateCourses(courses.filter((c) => c.id !== id));
    }
  };

  const handleAddCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name) {
      alert('Course code and name are required.');
      return;
    }

    const created: Course = {
      id: `manual-${Date.now()}-${newCourse.code}`,
      code: newCourse.code.trim().toUpperCase(),
      name: newCourse.name.trim(),
      credits: Number(newCourse.credits) || 5,
      grade: String(newCourse.grade || '5').trim().toUpperCase(),
      date: newCourse.date || new Date().toISOString().split('T')[0],
      passed: newCourse.passed !== false,
      level: newCourse.level,
    };

    onUpdateCourses([...courses, created]);
    setIsAddModalOpen(false);
    setNewCourse({
      code: '',
      name: '',
      credits: 5,
      grade: '5',
      date: new Date().toISOString().split('T')[0],
      passed: true,
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search, Filter & Add Course Toolbar */}
      <div className="flex flex-col gap-3 border-2 border-black bg-white p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black" />
            <input
              type="text"
              placeholder="SEARCH CODE OR COURSE NAME..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-2 border-black bg-white py-2 pl-9 pr-3 font-mono text-xs font-bold text-black uppercase placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          {/* Grade Filter */}
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="border-2 border-black bg-white px-3 py-2 font-mono text-xs font-black uppercase text-black focus:outline-none cursor-pointer"
          >
            <option value="all">ALL GRADES</option>
            <option value="5">GRADE 5</option>
            <option value="4">GRADE 4</option>
            <option value="3">GRADE 3</option>
            <option value="2">GRADE 2</option>
            <option value="1">GRADE 1</option>
            <option value="pass">PASS (HYV)</option>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t sm:border-t-0 border-neutral-200">
          <span className="font-mono text-[11px] sm:text-xs font-bold uppercase text-neutral-600">
            SHOWING <strong className="text-black">{filteredCourses.length}</strong> COURSES //{' '}
            <strong className="text-[#1076db]">{totalFilteredCredits} OP</strong>
          </span>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 border-2 border-black bg-[#1076db] h-10 sm:h-auto px-4 py-2 font-black text-xs uppercase tracking-wider text-white hover:bg-black hover:text-white transition-none cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>ADD COURSE</span>
          </button>
        </div>
      </div>

      {/* Courses Table Container - Horizontal scrollable on narrow screens */}
      <div className="border-2 border-black bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs min-w-[620px]">
          <thead>
            <tr className="bg-black text-white font-mono text-xs font-black uppercase tracking-widest border-b-2 border-black">
              <th className="py-3 px-3 sm:px-4">CODE</th>
              <th className="py-3 px-3 sm:px-4">COURSE TITLE</th>
              <th className="py-3 px-3 sm:px-4 text-center">CREDITS</th>
              <th className="py-3 px-3 sm:px-4 text-center">GRADE</th>
              <th className="py-3 px-3 sm:px-4">COMPLETED</th>
              <th className="py-3 px-3 sm:px-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black text-black">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center font-mono text-xs uppercase text-neutral-500">
                  NO MATCHING COURSE ENTRIES LOCATED IN BUFFER.
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => {
                const isEditing = editingCourseId === course.id;

                if (isEditing) {
                  return (
                    <tr key={course.id} className="bg-neutral-100">
                      <td className="py-2.5 px-3 sm:px-4 font-mono font-black">
                        <input
                          type="text"
                          value={editForm.code || ''}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                          className="w-24 border-2 border-black px-2 py-1 font-mono text-xs uppercase font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 sm:px-4">
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full border-2 border-black px-2 py-1 text-xs font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">
                        <input
                          type="number"
                          step="0.5"
                          value={editForm.credits || 0}
                          onChange={(e) => setEditForm({ ...editForm, credits: Number(e.target.value) })}
                          className="w-16 border-2 border-black px-2 py-1 font-mono text-xs text-center font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">
                        <input
                          type="text"
                          value={editForm.grade || ''}
                          onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                          className="w-16 border-2 border-black px-2 py-1 font-mono text-xs text-center font-black uppercase"
                        />
                      </td>
                      <td className="py-2.5 px-3 sm:px-4">
                        <input
                          type="date"
                          value={editForm.date || ''}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="border-2 border-black px-2 py-1 font-mono text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="border-2 border-black bg-[#1076db] p-1.5 text-white hover:bg-black hover:text-white transition-none cursor-pointer"
                            title="Save changes"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCourseId(null)}
                            className="border-2 border-black bg-white p-1.5 text-black hover:bg-black hover:text-white transition-none cursor-pointer"
                            title="Cancel edit"
                          >
                            <X className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={course.id} className="hover:bg-neutral-100 transition-none">
                    <td className="py-3 px-3 sm:px-4 font-mono font-black text-black">
                      {course.code}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-bold text-black text-sm">
                      {course.name}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center font-mono font-black">
                      {course.credits} OP
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <span
                        className={`inline-block font-mono text-xs font-black uppercase px-2 py-0.5 border-2 border-black ${
                          course.grade === '5'
                            ? 'bg-[#1076db] text-white'
                            : course.grade === '4'
                            ? 'bg-black text-white'
                            : ['3', '2', '1'].includes(course.grade)
                            ? 'bg-white text-black'
                            : 'bg-black text-[#daedff]'
                        }`}
                      >
                        {course.grade}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-xs text-neutral-600">
                      {course.date}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(course)}
                          className="border-2 border-black bg-white p-2 sm:p-1.5 text-black hover:bg-[#1076db] hover:text-white transition-none cursor-pointer"
                          title="Edit course"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="border-2 border-black bg-white p-2 sm:p-1.5 text-black hover:bg-black hover:text-white transition-none cursor-pointer"
                          title="Delete course"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="relative w-full max-w-md border-2 sm:border-4 border-black bg-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-black -m-4 sm:-m-6 p-4 sm:p-6 mb-4 sm:mb-6 bg-black text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#daedff]" />
                <h3 className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  RECORD NEW COURSE ENTRY
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="border-2 border-white p-1 text-white hover:bg-[#1076db] hover:text-white hover:border-[#1076db] transition-none cursor-pointer"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCourseSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-black mb-1">
                  COURSE CODE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TKT10001"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full border-2 border-black p-2 font-mono text-xs uppercase font-bold text-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase text-black mb-1">
                  COURSE TITLE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OHJELMOINNIN PERUSTEET"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full border-2 border-black p-2 font-sans text-xs font-bold text-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-black mb-1">
                    CREDITS (OP)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                    className="w-full border-2 border-black p-2 font-mono text-xs font-bold text-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-black mb-1">
                    GRADE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="5 or HYV"
                    value={newCourse.grade}
                    onChange={(e) => setNewCourse({ ...newCourse, grade: e.target.value })}
                    className="w-full border-2 border-black p-2 font-mono text-xs font-black uppercase text-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase text-black mb-1">
                  COMPLETION DATE
                </label>
                <input
                  type="date"
                  required
                  value={newCourse.date}
                  onChange={(e) => setNewCourse({ ...newCourse, date: e.target.value })}
                  className="w-full border-2 border-black p-2 font-mono text-xs text-black focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="border-2 border-black bg-white px-4 sm:px-5 py-2 sm:py-2.5 font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-none cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="border-2 border-black bg-[#1076db] px-5 sm:px-6 py-2 sm:py-2.5 font-black text-xs uppercase tracking-wider text-white hover:bg-black hover:text-white transition-none cursor-pointer"
                >
                  SAVE ENTRY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
