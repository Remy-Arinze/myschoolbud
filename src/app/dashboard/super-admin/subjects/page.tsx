'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { BookOpen, Plus, Edit, Trash2, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  useGetAgoraSubjectRegistryQuery,
  useCreateAgoraSubjectMutation,
  useUpdateAgoraSubjectMutation,
  useDeleteAgoraSubjectMutation,
  AgoraSubjectDto,
  CreateAgoraSubjectDto
} from '@/lib/store/api/agoraCurriculumApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';

const SCHOOL_TYPES = [
  'PRIMARY',
  'SECONDARY',
  'TERTIARY',
  'KINDERGARTEN',
  'NURSERY'
];

export default function SuperAdminSubjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolType, setSelectedSchoolType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AgoraSubjectDto | null>(null);

  // API Hooks
  const { data, isLoading, refetch } = useGetAgoraSubjectRegistryQuery({
    schoolType: selectedSchoolType || undefined,
    search: searchQuery || undefined
  });

  const subjects = React.useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data as any).data || [];
  }, [data]);

  console.log('SuperAdminSubjectsPage: subjects count', subjects.length);

  const [createSubject, { isLoading: isCreating }] = useCreateAgoraSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateAgoraSubjectMutation();
  const [deleteSubject, { isLoading: isDeleting }] = useDeleteAgoraSubjectMutation();

  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (subject: AgoraSubjectDto) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete or deactivate this subject?')) return;
    try {
      await deleteSubject(id).unwrap();
      toast.success('Subject processed successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete subject');
    }
  };

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <div className="w-full space-y-6">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-2 font-heading" style={{ fontSize: 'var(--text-page-title)' }}>
              Bud library
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
              Manage the global library of standard subjects available to all schools.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Subject
            </Button>
          </div>
        </FadeInUp>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-light-border dark:border-dark-border pb-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-light-text-muted mb-2">Search Library</label>
            <div className="relative">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or code (e.g. Mathematics, ENG)..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-light-text-muted mb-2">School Type</label>
            <select
              value={selectedSchoolType}
              onChange={(e) => setSelectedSchoolType(e.target.value)}
              className="w-full px-3 py-2.5 border border-light-border dark:border-dark-border rounded-lg bg-light-surface dark:bg-[#1a1f2e] text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              style={{ fontSize: 'var(--text-small)' }}
            >
              <option value="">All School Types</option>
              {SCHOOL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
          ) : subjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <EmptyStateIcon type="document" />
                <h3 className="text-lg font-semibold mt-4 text-light-text-primary dark:text-dark-text-primary">No subjects found</h3>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2 max-w-sm">
                  No subjects match your current filter. Try adjusting your search or school type.
                </p>
                <Button variant="primary" className="mt-6" onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Subject
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject: AgoraSubjectDto) => (
                <Card key={subject.id || `sub-${subject.code}-${Math.random()}`} className={cn("transition-all border hover:shadow-md", !subject.isActive && "opacity-60")}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-heading" style={{ fontSize: 'var(--text-card-title)' }}>
                        {subject.name}
                      </CardTitle>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        subject.isActive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {subject.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">
                        {subject.code}
                      </Badge>
                      {subject.category && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight">
                          {subject.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-light-text-muted mb-1 uppercase tracking-widest">Supports</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(subject.schoolTypes) && subject.schoolTypes.map(type => (
                          <span key={type} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    {subject.description && (
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-3 line-clamp-2" style={{ fontSize: 'var(--text-tiny)' }}>
                        {subject.description}
                      </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => handleOpenEditModal(subject)}
                      >
                        <Edit className="w-3.5 h-3.5 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(subject.id)}
                        isLoading={isDeleting}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Subject Modal */}
        <SubjectFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          subject={editingSubject}
          isCreating={isCreating}
          isUpdating={isUpdating}
          onSave={async (data) => {
            try {
              if (editingSubject) {
                await updateSubject({ id: editingSubject.id, data }).unwrap();
                toast.success('Subject updated successfully');
              } else {
                await createSubject(data as CreateAgoraSubjectDto).unwrap();
                toast.success('Subject created successfully');
              }
              setIsModalOpen(false);
            } catch (err: any) {
              toast.error(err?.data?.message || 'Failed to save subject');
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
}

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AgoraSubjectDto | null;
  onSave: (data: any) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
}

function SubjectFormModal({ isOpen, onClose, subject, onSave, isCreating, isUpdating }: SubjectFormModalProps) {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [category, setCategory] = useState(subject?.category || 'CORE');
  const [description, setDescription] = useState(subject?.description || '');
  const [schoolTypes, setSchoolTypes] = useState<string[]>(subject?.schoolTypes || ['PRIMARY', 'SECONDARY']);
  const [isActive, setIsActive] = useState(subject?.isActive ?? true);

  // Reset form when subject changes
  React.useEffect(() => {
    if (isOpen) {
      setName(subject?.name || '');
      setCode(subject?.code || '');
      setCategory(subject?.category || 'CORE');
      setDescription(subject?.description || '');
      setSchoolTypes(subject?.schoolTypes || ['PRIMARY', 'SECONDARY']);
      setIsActive(subject?.isActive ?? true);
    }
  }, [subject, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      code,
      category,
      description,
      schoolTypes,
      isActive
    });
  };

  const toggleSchoolType = (type: string) => {
    setSchoolTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subject ? "Edit Subject" : "Add New Subject"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-1">
            <label className="block font-medium mb-1 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
              Subject Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="block font-medium mb-1 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
              Subject Code *
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MATH"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-surface dark:bg-[#1a1f2e] text-light-text-primary dark:text-dark-text-primary"
          >
            <option value="CORE">CORE</option>
            <option value="ELECTIVE">ELECTIVE</option>
            <option value="VOCATIONAL">VOCATIONAL</option>
            <option value="RELIGIOUS">RELIGIOUS</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
            School Types *
          </label>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleSchoolType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
                  schoolTypes.includes(type)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          {schoolTypes.length === 0 && <p className="text-red-500 text-[10px] mt-1">Please select at least one school type.</p>}
        </div>

        <div>
          <label className="block font-medium mb-1 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this subject covers..."
            rows={3}
          />
        </div>

        {subject && (
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Mark as active
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating || isUpdating}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isCreating || isUpdating} disabled={schoolTypes.length === 0}>
            {subject ? 'Update Subject' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
