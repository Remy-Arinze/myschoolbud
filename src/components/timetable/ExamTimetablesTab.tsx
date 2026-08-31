'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetClassesQuery,
  useGetSubjectsQuery,
  useGetRoomsQuery,
  useGetStaffListQuery,
  useGetExamTimetableQuery,
  useCreateExamTimetableSlotMutation,
  useDeleteExamTimetableSlotMutation,
  usePublishExamTimetableMutation,
  useUnpublishExamTimetableMutation,
  type ExamTimetableSlot,
  type Class,
} from '@/lib/store/api/schoolAdminApi';
import {
  GraduationCap,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  Settings,
} from 'lucide-react';
import { buildTermOptions } from '@/lib/academic/buildTermOptions';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const EMPTY_FORM = {
  examDate: '',
  startTime: '09:00',
  endTime: '11:00',
  subjectId: '',
  classId: '',
  teacherId: '',
  roomId: '',
  notes: '',
};

export function ExamTimetablesTab() {
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  const { data: schoolResponse, isLoading: isLoadingSchool } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  const { data: activeSessionResponse, isLoading: isLoadingSession } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId },
  );
  const activeTerm = activeSessionResponse?.data?.term;

  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId },
  );

  const [selectedTermId, setSelectedTermId] = useState('');
  const termId = selectedTermId || activeTerm?.id || '';

  const selectedTerm = useMemo(() => {
    if (!sessionsResponse?.data || !termId) return activeTerm;
    for (const session of sessionsResponse.data) {
      const t = session.terms?.find((x) => x.id === termId);
      if (t) return t;
    }
    return activeTerm;
  }, [sessionsResponse, termId, activeTerm]);

  const isPublished = !!selectedTerm?.examTimetablePublishedAt;
  const hasExamWindow = !!(selectedTerm?.examStart && selectedTerm?.examEnd);

  const { data: slotsResponse, isLoading: isLoadingSlots, refetch } = useGetExamTimetableQuery(
    { schoolId: schoolId!, termId },
    { skip: !schoolId || !termId },
  );
  const slots = slotsResponse?.data || [];

  const { data: classesResponse } = useGetClassesQuery(
    { schoolId: schoolId!, type: currentType || undefined },
    { skip: !schoolId },
  );
  const classes = classesResponse?.data || [];

  const { data: subjectsResponse } = useGetSubjectsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId },
  );
  const subjects = subjectsResponse?.data || [];

  const { data: roomsResponse } = useGetRoomsQuery({ schoolId: schoolId! }, { skip: !schoolId });
  const rooms = roomsResponse?.data || [];

  const { data: staffResponse } = useGetStaffListQuery({ limit: 100 }, { skip: !schoolId });
  const teachers = (staffResponse?.data?.items || []).filter((s) => s.type === 'teacher');

  const [createSlot, { isLoading: isCreating }] = useCreateExamTimetableSlotMutation();
  const [deleteSlot, { isLoading: isDeleting }] = useDeleteExamTimetableSlotMutation();
  const [publishExam, { isLoading: isPublishing }] = usePublishExamTimetableMutation();
  const [unpublishExam, { isLoading: isUnpublishing }] = useUnpublishExamTimetableMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamTimetableSlot | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const terms = useMemo(() => {
    const activeSessionId = activeSessionResponse?.data?.session?.id;
    return buildTermOptions(sessionsResponse?.data, {
      schoolType: currentType || null,
      sessionIds: activeSessionId ? [activeSessionId] : undefined,
    });
  }, [sessionsResponse, currentType, activeSessionResponse?.data?.session?.id]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, ExamTimetableSlot[]>();
    slots.forEach((slot) => {
      const key = slot.examDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const handleCreate = async () => {
    if (!schoolId || !termId) return;
    if (!form.examDate || !form.subjectId || !form.classId) {
      toast.error('Date, subject, and class are required');
      return;
    }
    const cls = classes.find((c: Class) => c.id === form.classId);
    try {
      await createSlot({
        schoolId,
        termId,
        examDate: form.examDate,
        startTime: form.startTime,
        endTime: form.endTime,
        subjectId: form.subjectId,
        classId: cls?.classArmId ? undefined : form.classId,
        classArmId: cls?.classArmId || undefined,
        teacherId: form.teacherId || undefined,
        roomId: form.roomId || undefined,
        notes: form.notes || undefined,
      }).unwrap();
      toast.success('Exam slot added');
      setForm(EMPTY_FORM);
      setShowAddModal(false);
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to add exam slot');
    }
  };

  const handleDelete = async () => {
    if (!schoolId || !deleteTarget) return;
    try {
      await deleteSlot({
        schoolId,
        slotId: deleteTarget.id,
        termId,
      }).unwrap();
      toast.success('Exam slot removed');
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to delete slot');
    }
  };

  const handlePublish = async () => {
    if (!schoolId || !termId) return;
    try {
      await publishExam({ schoolId, termId }).unwrap();
      toast.success('Exam timetable published — lesson schedules paused during exam period');
      setShowPublishConfirm(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to publish');
    }
  };

  const handleUnpublish = async () => {
    if (!schoolId || !termId) return;
    try {
      await unpublishExam({ schoolId, termId }).unwrap();
      toast.success('Exam timetable unpublished');
      setShowUnpublishConfirm(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to unpublish');
    }
  };

  if (isLoadingSchool || isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-2xl">
          Build and publish end-of-{terminology.periodSingular.toLowerCase()} exam schedules.
          When published, regular timetables pause during the exam window.
        </p>
        <PermissionGate resource={PermissionResource.TIMETABLES} type={PermissionType.ADMIN}>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!isPublished ? (
              <>
                <Button
                  onClick={() => setShowAddModal(true)}
                  disabled={!hasExamWindow || isPublished}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add exam slot
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={!hasExamWindow || slots.length === 0 || isPublished}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Publish exam timetable
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowUnpublishConfirm(true)}
                className="gap-2"
              >
                <Unlock className="h-4 w-4" />
                Unpublish to edit
              </Button>
            )}
          </div>
        </PermissionGate>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-light-text-muted uppercase tracking-wide">
                {terminology.periodSingular}
              </label>
              <Select
                value={termId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="mt-1"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.sessionName})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-light-text-muted uppercase tracking-wide">
                Exam window
              </label>
              {hasExamWindow ? (
                <p className="mt-2 text-sm font-medium">
                  {format(new Date(selectedTerm!.examStart!), 'MMM d, yyyy')} –{' '}
                  {format(new Date(selectedTerm!.examEnd!), 'MMM d, yyyy')}
                </p>
              ) : (
                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Not set —{' '}
                  <Link
                    href="/dashboard/school/settings/session"
                    className="underline inline-flex items-center gap-1"
                  >
                    set exam dates <Settings className="h-3 w-3" />
                  </Link>
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-light-text-muted uppercase tracking-wide">
                Status
              </label>
              <div className="mt-2">
                {isPublished ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    <Lock className="h-3.5 w-3.5" />
                    Published
                    {selectedTerm?.examTimetablePublishedAt && (
                      <span className="font-normal opacity-80">
                        · {format(parseISO(selectedTerm.examTimetablePublishedAt), 'MMM d')}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Draft — {slots.length} slot{slots.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasExamWindow && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Set the exam start and end dates on this {terminology.periodSingular.toLowerCase()} before
          adding slots. Use session settings or the term dates editor on the overview page.
        </div>
      )}

      {isPublished && (
        <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-900 dark:text-green-100">
          Exam timetable is live. Teachers and students see exam slots instead of regular classes
          during the exam window. Unpublish to add or edit slots.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exam schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSlots ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-light-text-muted" />
            </div>
          ) : slots.length === 0 ? (
            <div className="py-12 text-center text-light-text-secondary">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No exam slots yet.</p>
              {hasExamWindow && !isPublished && (
                <p className="text-sm mt-1">Add one slot per subject paper (date, time, class).</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {slotsByDate.map(([dateKey, daySlots]) => (
                <div key={dateKey}>
                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                    {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-light-border dark:border-dark-border text-left text-light-text-muted">
                          <th className="py-2 pr-4">Time</th>
                          <th className="py-2 pr-4">Subject</th>
                          <th className="py-2 pr-4">Class</th>
                          <th className="py-2 pr-4">Teacher</th>
                          <th className="py-2 pr-4">Room</th>
                          {!isPublished && <th className="py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {daySlots.map((slot) => (
                          <tr
                            key={slot.id}
                            className="border-b border-light-border/50 dark:border-dark-border/50"
                          >
                            <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                              {slot.startTime} – {slot.endTime}
                            </td>
                            <td className="py-2.5 pr-4">{slot.subjectName}</td>
                            <td className="py-2.5 pr-4">
                              {slot.classArmName || slot.className || '—'}
                            </td>
                            <td className="py-2.5 pr-4">{slot.teacherName || '—'}</td>
                            <td className="py-2.5 pr-4">{slot.roomName || '—'}</td>
                            {!isPublished && (
                              <td className="py-2.5">
                                <PermissionGate
                                  resource={PermissionResource.TIMETABLES}
                                  type={PermissionType.ADMIN}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(slot)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Remove slot"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </PermissionGate>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add exam slot"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exam date *</label>
            <DatePicker
              value={form.examDate}
              onChange={(v) => setForm((f) => ({ ...f, examDate: v }))}
              min={selectedTerm?.examStart?.slice(0, 10)}
              max={selectedTerm?.examEnd?.slice(0, 10)}
              placeholder="Select date within exam window"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start time *</label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End time *</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject *</label>
            <Select
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            >
              <option value="">Select subject</option>
              {subjects.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class *</label>
            <Select
              value={form.classId}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            >
              <option value="">Select class</option>
              {classes.map((c: Class) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Invigilator (optional)</label>
              <Select
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
              >
                <option value="">Any / not set</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room (optional)</label>
              <Select
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
              >
                <option value="">Not set</option>
                {rooms.map((r: { id: string; name: string }) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Paper 1 — Objective"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add slot'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublish}
        title="Publish exam timetable?"
        message={`This will hide regular lesson timetables for teachers and students during the exam period (${slots.length} slots). Teachers can then publish EXAM assessments if scheme of work is complete.`}
        confirmText="Publish"
        isLoading={isPublishing}
      />

      <ConfirmModal
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleUnpublish}
        title="Unpublish exam timetable?"
        message="Regular timetables will show again during the exam window until you re-publish. You can edit slots while unpublished."
        confirmText="Unpublish"
        variant="danger"
        isLoading={isUnpublishing}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove exam slot?"
        message={`Remove ${deleteTarget?.subjectName} on ${deleteTarget?.examDate?.slice(0, 10)}?`}
        confirmText="Remove"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
