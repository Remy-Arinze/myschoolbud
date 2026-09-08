'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Plus, Trash2, Upload as UploadIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useUploadMultipleAgoraCurriculumSourcesMutation, AgoraSubjectDto } from '@/lib/store/api/agoraCurriculumApi';

const MAX_QUEUE = 40;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const COMMON_GRADES = [
  { label: 'JSS 1', value: 'JSS_1' },
  { label: 'JSS 2', value: 'JSS_2' },
  { label: 'JSS 3', value: 'JSS_3' },
  { label: 'SS 1', value: 'SS_1' },
  { label: 'SS 2', value: 'SS_2' },
  { label: 'SS 3', value: 'SS_3' },
  { label: 'Pry 1', value: 'PRIMARY_1' },
  { label: 'Pry 2', value: 'PRIMARY_2' },
  { label: 'Pry 3', value: 'PRIMARY_3' },
  { label: 'Pry 4', value: 'PRIMARY_4' },
  { label: 'Pry 5', value: 'PRIMARY_5' },
  { label: 'Pry 6', value: 'PRIMARY_6' },
] as const;

const fieldClass =
  'w-full px-4 py-2.5 border border-light-border dark:border-dark-border rounded-xl bg-light-surface dark:bg-[#1a1f2e] text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all';

type QueueEntry = {
  id: string;
  subjectId: string;
  subjectName: string;
  gradeLevel: string;
  file: File;
};

function isSupportedFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
}

function gradeLabel(value: string) {
  return COMMON_GRADES.find((grade) => grade.value === value)?.label || value.replace(/_/g, ' ');
}

const JUNIOR_ONLY_CODES = new Set(['BSC', 'SST', 'CCA', 'PHE', 'BTC', 'NLG', 'RKS', 'HOM']);
const SENIOR_ONLY_CODES = new Set(['PHY', 'CHM', 'BIO', 'LIT', 'GEO', 'HIS', 'ECO', 'GOV', 'FMT', 'ACC', 'COM', 'TDR', 'FNT']);

function streamFromGrade(grade: string): 'PRIMARY' | 'JUNIOR' | 'SENIOR' | null {
  const value = grade.toUpperCase();
  if (value.startsWith('PRIMARY') || value.startsWith('PRY') || value.startsWith('NURSERY')) return 'PRIMARY';
  if (value.startsWith('JSS') || value.includes('JUNIOR')) return 'JUNIOR';
  if ((value.startsWith('SS') && !value.startsWith('JSS')) || value.includes('SENIOR')) return 'SENIOR';
  return null;
}

function subjectOfferedForStream(subject: AgoraSubjectDto, stream: 'PRIMARY' | 'JUNIOR' | 'SENIOR' | null) {
  if (!stream) return true;
  const streams = subject.levelStreams ?? [];
  if (streams.length > 0) return streams.includes(stream);

  const types = subject.schoolTypes ?? [];
  if (stream === 'PRIMARY') return types.includes('PRIMARY');
  if (!types.includes('SECONDARY')) return false;
  if (stream === 'JUNIOR') return JUNIOR_ONLY_CODES.has(subject.code) || !SENIOR_ONLY_CODES.has(subject.code);
  return SENIOR_ONLY_CODES.has(subject.code) || !JUNIOR_ONLY_CODES.has(subject.code);
}

export function UploadCurriculumSourceModal({
  isOpen,
  onClose,
  subjects,
}: {
  isOpen: boolean;
  onClose: () => void;
  subjects: AgoraSubjectDto[];
}) {
  const [subjectId, setSubjectId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('JSS_1');
  const [customGrade, setCustomGrade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMultiple, { isLoading }] = useUploadMultipleAgoraCurriculumSourcesMutation();

  const resetComposer = () => {
    setSubjectId('');
    setFile(null);
    setCustomGrade('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetAll = () => {
    resetComposer();
    setGradeLevel('JSS_1');
    setQueue([]);
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isOpen) resetAll();
  }, [isOpen]);

  const resolvedGrade = customGrade.trim()
    ? customGrade.trim().toUpperCase().replace(/\s+/g, '_')
    : gradeLevel;
  const classStream = streamFromGrade(resolvedGrade);
  const offeredSubjects = useMemo(
    () => subjects.filter((subject) => subject.isActive !== false && subjectOfferedForStream(subject, classStream)),
    [subjects, classStream]
  );

  useEffect(() => {
    if (subjectId && !offeredSubjects.some((subject) => subject.id === subjectId)) {
      setSubjectId('');
    }
  }, [offeredSubjects, subjectId]);

  const composerReady = Boolean(subjectId && file && resolvedGrade);
  const uploadCount = queue.length + (composerReady ? 1 : 0);

  const pickFile = (incoming: File | undefined) => {
    if (!incoming) return;
    if (!isSupportedFile(incoming)) {
      toast.error('Only PDF and Word documents are supported.');
      return;
    }
    if (incoming.size > MAX_FILE_BYTES) {
      toast.error('File is over 20MB.');
      return;
    }
    setFile(incoming);
  };

  const handleAdd = () => {
    if (!subjectId || !file || !resolvedGrade) {
      toast.error('Select a subject, a class, and one document first.');
      return;
    }
    if (queue.length >= MAX_QUEUE) {
      toast.error(`Queue is limited to ${MAX_QUEUE} entries.`);
      return;
    }

    const subjectName = subjects.find((subject) => subject.id === subjectId)?.name || 'Subject';
    setQueue((prev) => [
      ...prev,
      { id: crypto.randomUUID(), subjectId, subjectName, gradeLevel: resolvedGrade, file },
    ]);
    resetComposer();
  };

  const collectJobs = (): QueueEntry[] | null => {
    const jobs = [...queue];
    if (subjectId && file && resolvedGrade) {
      const subjectName = subjects.find((subject) => subject.id === subjectId)?.name || 'Subject';
      jobs.push({
        id: crypto.randomUUID(),
        subjectId,
        subjectName,
        gradeLevel: resolvedGrade,
        file,
      });
    }
    if (jobs.length === 0) {
      toast.error('Add at least one entry to the queue.');
      return null;
    }
    return jobs;
  };

  const handleUpload = async () => {
    const jobs = collectJobs();
    if (!jobs) return;

    try {
      const formData = new FormData();
      jobs.forEach((job) => formData.append('files', job.file));
      formData.append(
        'entries',
        JSON.stringify(
          jobs.map((job, fileIndex) => ({
            fileIndex,
            subjectId: job.subjectId,
            gradeLevel: job.gradeLevel,
          }))
        )
      );
      formData.append('sourceType', 'FILE_UPLOAD');

      await uploadMultiple(formData).unwrap();
      toast.success(`${jobs.length} source${jobs.length === 1 ? '' : 's'} queued. Lois will process them one at a time.`);
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to upload sources');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Upload Curriculum Source"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {uploadCount === 0
              ? 'Add entries, then upload. Lois processes them one after another.'
              : `${uploadCount} ready · processed one at a time`}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isLoading}
              onClick={handleUpload}
              className="rounded-xl px-8 shadow-lg shadow-blue-500/20"
            >
              Upload{uploadCount > 0 ? ` ${uploadCount}` : ''}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
                1. Class *
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {COMMON_GRADES.map((grade) => (
                  <button
                    key={grade.value}
                    type="button"
                    onClick={() => {
                      setGradeLevel(grade.value);
                      setCustomGrade('');
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                      !customGrade && gradeLevel === grade.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-light-surface dark:bg-[#1a1f2e] text-gray-600 dark:text-gray-400 border-light-border dark:border-dark-border hover:border-blue-400'
                    )}
                  >
                    {grade.label}
                  </button>
                ))}
              </div>
              <Input
                value={customGrade}
                onChange={(e) => setCustomGrade(e.target.value)}
                placeholder="Other (e.g. NURSERY_1)"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
                2. Subject *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={fieldClass}
              >
                <option value="">
                  {offeredSubjects.length === 0 ? 'No subjects for this class' : 'Choose a subject...'}
                </option>
                {offeredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                {classStream === 'PRIMARY' && 'Primary subjects only'}
                {classStream === 'JUNIOR' && 'JSS subjects only'}
                {classStream === 'SENIOR' && 'SS subjects only'}
                {!classStream && 'Showing all subjects for this custom class'}
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
              3. Document *
            </label>
            <div
              className={cn(
                'border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[168px]',
                file
                  ? 'border-blue-500 bg-blue-50/10'
                  : 'border-gray-200 dark:border-gray-800 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/20',
                isDragging && 'border-blue-500 bg-blue-50/20'
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {file ? (
                <div className="w-full flex items-center justify-between gap-3 p-2.5 bg-light-surface dark:bg-dark-surface rounded-xl border border-light-border dark:border-dark-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-medium truncate text-light-text-primary dark:text-dark-text-primary">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                    isDragging ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}>
                    <UploadIcon className={cn('w-6 h-6', isDragging && 'animate-bounce')} />
                  </div>
                  <p className="font-semibold text-xs text-light-text-primary dark:text-dark-text-primary">
                    {isDragging ? 'Drop it here' : 'Click or drop one document'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">Word or PDF. Max 20MB.</p>
                </>
              )}
            </div>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={handleAdd} className="w-full rounded-xl h-11">
          <Plus className="w-4 h-4 mr-2" />
          Add to queue
        </Button>

        {queue.length > 0 && (
          <div className="rounded-2xl border border-light-border dark:border-white/10 overflow-hidden">
            <div className="px-4 py-3 bg-light-surface/70 dark:bg-white/[0.03] border-b border-light-border dark:border-white/10">
              <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                Ready to upload
              </p>
            </div>
            <ul className="divide-y divide-light-border dark:divide-white/10 max-h-[240px] overflow-y-auto">
              {queue.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                      {entry.subjectName}
                      <span className="text-light-text-secondary dark:text-dark-text-secondary font-normal">
                        {' · '}{gradeLabel(entry.gradeLevel)}
                      </span>
                    </p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">{entry.file.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQueue((prev) => prev.filter((item) => item.id !== entry.id))}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={`Remove ${entry.subjectName} ${entry.gradeLevel}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
