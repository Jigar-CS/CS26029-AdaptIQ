'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  Building,
  GraduationCap,
  Layers,
} from 'lucide-react';

interface FacultyCourseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AssignedCourse {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  department?: {
    code: string;
    name: string;
    institute?: { code: string; name: string };
  };
  assignedAt: string;
}

interface FacultyItem {
  facultyId: string;
  userId: string;
  email: string;
  employeeCode: string | null;
  departmentId: string | null;
  primaryCourse?: {
    id: string;
    code: string;
    name: string;
    department?: {
      code: string;
      name: string;
      institute?: { code: string };
    };
  } | null;
  additionalCourses: AssignedCourse[];
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  semester: number;
  department?: {
    code: string;
    name: string;
    institute?: { code: string; name: string };
  };
}

export function FacultyCourseAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
}: FacultyCourseAssignmentModalProps) {
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isHOD, setIsHOD] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res: any = await api.get('/admin/faculty-course-assignments');
      setFaculties(res.faculties || []);
      setCourses(res.availableCourses || []);
      setIsHOD(!!res.isHOD);
      if (res.faculties?.length > 0 && !selectedFacultyId) {
        setSelectedFacultyId(res.faculties[0].facultyId);
      }
      if (res.availableCourses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(res.availableCourses[0].id);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to load assignments.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId || !selectedCourseId) return;

    setAssigning(true);
    setNotification(null);
    try {
      const res: any = await api.post('/admin/faculty-course-assignments', {
        facultyId: selectedFacultyId,
        courseId: selectedCourseId,
      });

      setNotification({
        type: 'success',
        message: res.message || 'Subject assigned successfully!',
      });
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to assign subject.',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (facultyId: string, courseId: string) => {
    if (!confirm('Are you sure you want to unassign this course from the faculty?')) return;

    setNotification(null);
    try {
      const res: any = await api.delete(`/admin/faculty-course-assignments/${facultyId}/${courseId}`);
      setNotification({
        type: 'success',
        message: res.message || 'Subject unassigned successfully.',
      });
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to unassign subject.',
      });
    }
  };

  if (!isOpen) return null;

  const filteredFaculties = faculties.filter((f) => {
    const q = searchQuery.toLowerCase();
    const emailMatch = f.email.toLowerCase().includes(q);
    const empMatch = f.employeeCode?.toLowerCase().includes(q);
    const courseMatch = f.primaryCourse?.code.toLowerCase().includes(q) ||
      f.primaryCourse?.name.toLowerCase().includes(q) ||
      f.additionalCourses.some((c) => c.courseCode.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q));
    return emailMatch || empMatch || courseMatch;
  });

  const selectedFaculty = faculties.find((f) => f.facultyId === selectedFacultyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121b30] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Faculty Course Multi-Assignment</h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                  {isHOD ? 'HOD Department Console' : 'Super Admin University-Wide'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                {isHOD
                  ? 'Assign any faculty to subjects within your department. Visibility is isolated to your department.'
                  : 'Assign any faculty to one or more subjects across any institute and department.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs">Loading faculty profiles and course assignments...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 p-6 gap-6">
            {/* Left Column: Quick Assignment Form & Search */}
            <div className="md:col-span-5 flex flex-col gap-4 border-r border-slate-200 dark:border-slate-800/80 pr-6 overflow-y-auto">
              <form onSubmit={handleAssign} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Assign New Subject</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Select Faculty</label>
                  <select
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    {faculties.map((f) => (
                      <option key={f.facultyId} value={f.facultyId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {f.email.split('@')[0]} ({f.primaryCourse?.code || 'No Subject'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Subject {isHOD ? '(Your Dept Only)' : '(Across All Depts)'}
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {c.code} — {c.name} ({c.department?.code || ''})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={assigning}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2 mt-2"
                >
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Assign Subject</span>
                </button>
              </form>

              {/* Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter faculty or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
                />
              </div>

              {/* Faculty quick list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-60">
                {filteredFaculties.map((f) => {
                  const isSelected = selectedFacultyId === f.facultyId;
                  return (
                    <button
                      key={f.facultyId}
                      onClick={() => setSelectedFacultyId(f.facultyId)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-slate-900 dark:text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold truncate ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                          {f.email.split('@')[0]}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {1 + f.additionalCourses.length} {1 + f.additionalCourses.length === 1 ? 'subject' : 'subjects'}
                        </span>
                      </div>
                      <span className={`text-[10px] truncate ${isSelected ? 'text-indigo-700/80 dark:text-indigo-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        Primary: {f.primaryCourse?.code || 'None'} • {f.email}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Detailed View of Selected Faculty */}
            <div className="md:col-span-7 flex flex-col gap-4 overflow-y-auto">
              {selectedFaculty ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedFaculty.email.split('@')[0]}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{selectedFaculty.email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>All Assigned Teaching Subjects</span>
                    </h5>

                    <div className="space-y-2">
                      {/* Primary Subject */}
                      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-slate-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {selectedFaculty.primaryCourse?.code || 'No Primary Subject'}
                            </span>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                              Primary Subject
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {selectedFaculty.primaryCourse?.name || 'Assigned via Profile'}
                            {selectedFaculty.primaryCourse?.department && (
                              <span className="ml-1 text-slate-500 dark:text-slate-400">
                                • {selectedFaculty.primaryCourse.department.code} ({selectedFaculty.primaryCourse.department.institute?.code})
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 font-mono bg-indigo-100/80 dark:bg-indigo-500/20 border border-indigo-200/80 dark:border-indigo-500/30 px-2 py-0.5 rounded-md">Permanent</span>
                      </div>

                      {/* Additional Subjects */}
                      {selectedFaculty.additionalCourses.map((ac) => (
                        <div
                          key={ac.assignmentId}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{ac.courseCode}</span>
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                Additional Subject
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {ac.courseName}
                              {ac.department && (
                                <span className="ml-1 text-slate-500 dark:text-slate-400">
                                  • {ac.department.code} ({ac.department.institute?.code})
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(selectedFaculty.facultyId, ac.courseId)}
                            className="p-1.5 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition flex items-center gap-1 text-[11px] font-medium"
                            title="Unassign this subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}

                      {selectedFaculty.additionalCourses.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic p-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center bg-slate-50/50 dark:bg-slate-950/20">
                          No additional subjects assigned yet. Select a subject from the left panel to assign.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                  Select a faculty member from the list to view their subjects.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Faculties assigned to multiple subjects can create assessments and view questions for all assigned subjects.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
