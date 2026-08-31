'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Input } from '@/components/ui/Input';
import { BookOpen, Plus, FileText, CheckCircle2, Layers, AlertCircle, Clock, Upload as UploadIcon, Trash2, Trash2 as Trash, HardDrive, Check, ChevronRight, Info, ExternalLink, FileJson, Terminal, Loader2, Library, XCircle, Edit2, Sparkles, Target, Users, ClipboardCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  useGetAgoraCurriculumSourcesQuery,
  useGetAgoraCurriculaQuery,
  useGetAgoraSubjectRegistryQuery,
  useCreateAgoraCurriculumSourceMutation,
  useUploadAgoraCurriculumSourceMutation,
  useUploadMultipleAgoraCurriculumSourcesMutation,
  useGetSourceStatusQuery,
  useConsolidateAgoraCurriculumMutation,
  usePublishAgoraCurriculumMutation,
  useDeleteAgoraCurriculumSourceMutation,
  useCancelAgoraCurriculumProcessingMutation,
  useGetAgoraCurriculumQuery,
  useDeleteAgoraCurriculumMutation,
  useUpdateAgoraCurriculumTopicMutation,
  useAddAgoraCurriculumTopicMutation,
  useDeleteAgoraCurriculumTopicMutation,
  AgoraSubjectDto,
  AgoraCurriculumSource,
  AgoraCurriculum
} from '@/lib/store/api/agoraCurriculumApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { Select } from '@/components/ui/Select';

export default function SuperAdminCurriculumPage() {
  const [activeTab, setActiveTab] = useState<'consolidated' | 'sources'>('consolidated');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedCurriculumIds, setSelectedCurriculumIds] = useState<string[]>([]);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [previewCurriculumId, setPreviewCurriculumId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'source' | 'curriculum', ids: string[] } | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Filters
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterGradeLevel, setFilterGradeLevel] = useState('all');

  const commonGrades = [
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
  ];

  // Fetch data
  const [isAnyProcessing, setIsAnyProcessing] = useState(false);

  const { data: sources, isLoading: isSourcesLoading } = useGetAgoraCurriculumSourcesQuery(undefined, {
    pollingInterval: isAnyProcessing ? 5000 : 0
  });
  const { data: curricula, isLoading: isCurriculaLoading } = useGetAgoraCurriculaQuery(undefined, {
    pollingInterval: isAnyProcessing ? 5000 : 0
  });

  useEffect(() => {
    const hasActiveSources = sources?.some(s => s.status === 'PENDING_PARSE' || s.status === 'PARSING');
    const hasConsolidatingCurricula = curricula?.some(c => c.status === 'DRAFT' && (!c.topics || (Array.isArray(c.topics) && c.topics.length === 0)));
    setIsAnyProcessing(!!(hasActiveSources || hasConsolidatingCurricula));
  }, [sources, curricula]);

  const { data: subjectsData } = useGetAgoraSubjectRegistryQuery();
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  const [consolidateSources, { isLoading: isConsolidating }] = useConsolidateAgoraCurriculumMutation();
  const [publishCurriculum, { isLoading: isPublishing }] = usePublishAgoraCurriculumMutation();
  const [deleteSource] = useDeleteAgoraCurriculumSourceMutation();
  const [deleteCurriculum] = useDeleteAgoraCurriculumMutation();

  // Filters
  const filteredSources = Array.isArray(sources) ? sources.filter(s => {
    const matchesSearch = s.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubjectId === 'all' || s.subjectId === filterSubjectId || s.subject?.id === filterSubjectId;
    const matchesGrade = filterGradeLevel === 'all' || s.gradeLevel === filterGradeLevel;

    return matchesSearch && matchesSubject && matchesGrade;
  }) : [];

  const filteredCurricula = Array.isArray(curricula) ? curricula.filter(c => {
    const matchesSearch = c.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubjectId === 'all' || c.subjectId === filterSubjectId || c.subject?.id === filterSubjectId;
    const matchesGrade = filterGradeLevel === 'all' || c.gradeLevel === filterGradeLevel;

    return matchesSearch && matchesSubject && matchesGrade;
  }) : [];

  const handleSelectSource = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectCurriculum = (id: string) => {
    setSelectedCurriculumIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const executeBulkDelete = async () => {
    if (!deleteTarget) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      if (deleteTarget.type === 'source') {
        const promises = deleteTarget.ids.map(id => deleteSource(id).unwrap().catch(() => { }));
        await Promise.all(promises);
        successCount = deleteTarget.ids.length;
        setSelectedSourceIds([]);
        if (deleteTarget.ids.length === 1 && viewingSourceId === deleteTarget.ids[0]) setViewingSourceId(null);
      } else {
        const promises = deleteTarget.ids.map(id => deleteCurriculum(id).unwrap().catch(() => { }));
        await Promise.all(promises);
        successCount = deleteTarget.ids.length;
        setSelectedCurriculumIds([]);
        if (deleteTarget.ids.length === 1 && previewCurriculumId === deleteTarget.ids[0]) setPreviewCurriculumId(null);
      }
      toast.success(`Deleted ${successCount} ${deleteTarget.type}(s)`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Some deletions failed.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const startLongPress = (id: string) => {
    setIsLongPressing(false);
    touchTimer.current = setTimeout(() => {
      handleSelectSource(id);
      setIsLongPressing(true);
      window.navigator.vibrate?.(50); // Haptic feedback if available
    }, 600);
  };

  const endLongPress = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
      // If it wasn't a long press, it's a normal click
      if (!isLongPressing) {
        // If we're already in selection mode, toggle instead of viewing
        if (selectedSourceIds.length > 0) {
          handleSelectSource(id);
        } else {
          setViewingSourceId(id);
        }
      }
    }
    setIsLongPressing(false);
  };

  const handleConsolidate = async (ids?: string[]) => {
    const targetIds = ids || selectedSourceIds;
    if (targetIds.length === 0) return;

    // Group selected sources to make sure they are of same subject and grade
    const selected = sources?.filter(s => targetIds.includes(s.id));
    if (!selected || selected.length === 0) return;

    const firstSubjectId = selected[0].subjectId || selected[0].subject?.id;
    const firstGradeLevel = selected[0].gradeLevel;

    if (!firstSubjectId) {
      toast.error('Selected sources are missing a subject. Please try again.');
      return;
    }

    const isMismatched = selected.some(s => {
      const sSubId = s.subjectId || s.subject?.id;
      return sSubId !== firstSubjectId || s.gradeLevel !== firstGradeLevel;
    });

    if (isMismatched) {
      toast.error('You can only consolidate sources for the same subject and grade level.');
      return;
    }

    try {
      await consolidateSources({
        subjectId: firstSubjectId,
        gradeLevel: firstGradeLevel,
        sourceIds: targetIds
      }).unwrap();
      toast.success('Consolidation started. A new draft curriculum will be created soon.');
      if (!ids) setSelectedSourceIds([]);
      setActiveTab('consolidated');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to start consolidation');
    }
  };

  const handlePublish = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try {
      await publishCurriculum({ id, data: { status: nextStatus } }).unwrap();
      toast.success(`Curriculum marked as ${nextStatus}`);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update publication status');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PARSED': return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Parsed</Badge>;
      case 'PARSING': return <Badge className="bg-amber-100 text-amber-800 animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Parsing...</Badge>;
      case 'PENDING_PARSE': return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
      case 'FAILED': return <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'PUBLISHED': return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Published</Badge>;
      case 'DRAFT': return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Draft</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <div className="w-full space-y-6">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-2 font-heading" style={{ fontSize: 'var(--text-page-title)' }}>
              Curriculum Management
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
              Upload source materials and manage consolidated master curricula.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setIsUploadModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Source
            </Button>
          </div>
        </FadeInUp>

        {/* Tabs and Search */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('consolidated')}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors whitespace-nowrap`}
              style={{
                fontSize: 'var(--text-tiny)',
                borderBottom: activeTab === 'consolidated' ? '2px solid' : 'none',
                borderColor: activeTab === 'consolidated' ? 'var(--agora-blue)' : 'transparent',
                color: activeTab === 'consolidated' ? 'var(--agora-blue)' : 'inherit'
              }}
            >
              <Layers className="w-4 h-4" />
              Consolidated
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors whitespace-nowrap`}
              style={{
                fontSize: 'var(--text-tiny)',
                borderBottom: activeTab === 'sources' ? '2px solid' : 'none',
                borderColor: activeTab === 'sources' ? 'var(--agora-blue)' : 'transparent',
                color: activeTab === 'sources' ? 'var(--agora-blue)' : 'inherit'
              }}
            >
              <FileText className="w-4 h-4" />
              Sources
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto pb-4 md:pb-0">
            <div className="w-full md:w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search keywords..."
              />
            </div>
            <div className="w-full md:w-40">
              <Select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                placeholder="All Subjects"
                className="py-1.5 text-xs"
              >
                <option value="all">All Subjects</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </Select>
            </div>
            <div className="w-full md:w-32">
              <Select
                value={filterGradeLevel}
                onChange={(e) => setFilterGradeLevel(e.target.value)}
                placeholder="All Grades"
                className="py-1.5 text-xs"
              >
                <option value="all">All Grades</option>
                {commonGrades.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.2}>
          {activeTab === 'consolidated' && (
            <div className="space-y-4">
              {isCurriculaLoading ? (
                <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
              ) : filteredCurricula.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <EmptyStateIcon type="statistics" />
                    <h3 className="text-lg font-semibold mt-4 text-light-text-primary dark:text-dark-text-primary">No consolidated curricula</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2 max-w-sm">
                      Select parsed sources in the Sources tab and consolidate them to create master curricula.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setActiveTab('sources')}>
                      Go to Sources
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {selectedCurriculumIds.length > 0 && (
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900/30">
                      <span className="font-medium text-red-800 dark:text-red-400" style={{ fontSize: 'var(--text-small)' }}>
                        {selectedCurriculumIds.length} curriculum version(s) selected
                      </span>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget({ type: 'curriculum', ids: selectedCurriculumIds })}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete Selected
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCurricula.map((curr: AgoraCurriculum) => (
                      <Card
                        key={curr.id}
                        className={cn(
                          "group transition-all border hover:shadow-md relative cursor-pointer",
                          selectedCurriculumIds.includes(curr.id)
                            ? "border-red-500 shadow-md ring-2 ring-red-500/20"
                            : "border-light-border dark:border-dark-border"
                        )}
                        onClick={() => setPreviewCurriculumId(curr.id)}
                      >
                        <div
                          className="absolute top-3 right-3 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCurriculum(curr.id);
                          }}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                            selectedCurriculumIds.includes(curr.id)
                              ? "bg-red-600 border-red-600 text-white"
                              : "border-gray-300 dark:border-gray-600 hover:border-red-400"
                          )}>
                            {selectedCurriculumIds.includes(curr.id) && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start pr-8">
                            <CardTitle className="font-heading" style={{ fontSize: 'var(--text-card-title)' }}>
                              {curr.subject?.name || 'Unknown Subject'}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {(!curr.topics || curr.topics.length === 0) ? (
                              <Badge className="bg-blue-50 text-blue-600 animate-pulse border-blue-100">
                                <Loader2 className="w-2.5 h-2.5 mr-1" /> Consolidating
                              </Badge>
                            ) : (
                              <Badge className={curr.status === 'PUBLISHED' ? "bg-green-50 text-green-600 border-green-100" : "bg-amber-50 text-amber-600 border-amber-100"}>
                                {curr.status}
                              </Badge>
                            )}
                            <span className="text-gray-300">•</span>
                            <p className="font-medium text-light-text-secondary" style={{ fontSize: 'var(--text-small)' }}>Grade: {curr.gradeLevel}</p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-light-text-muted mt-2 space-y-1" style={{ fontSize: 'var(--text-tiny)' }}>
                            <div className="flex justify-between">
                              <span>Version:</span>
                              <span className="font-medium">v{curr.version || 1}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Weeks:</span>
                              <span className="font-medium">{(curr.topics || []).length || '...'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sources:</span>
                              <span className="font-medium">{(curr.sourceIds || []).length}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                              Updated {curr.updatedAt ? new Date(curr.updatedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-4">
              {isSourcesLoading ? (
                <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
              ) : filteredSources.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <EmptyStateIcon type="document" />
                    <h3 className="text-lg font-semibold mt-4 text-light-text-primary dark:text-dark-text-primary">No sources found</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2 max-w-sm">
                      Upload curriculum documents to see them here, or try adjusting your search.
                    </p>
                    <Button variant="primary" className="mt-6" onClick={() => setIsUploadModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Source
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {selectedSourceIds.length > 0 && (
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900/30">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-red-800 dark:text-red-400" style={{ fontSize: 'var(--text-small)' }}>
                          {selectedSourceIds.length} source(s) selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 dark:text-red-400"
                          onClick={() => {
                            const allIds = filteredSources.map(s => s.id);
                            if (selectedSourceIds.length === allIds.length) {
                              setSelectedSourceIds([]);
                            } else {
                              setSelectedSourceIds(allIds);
                            }
                          }}
                        >
                          {selectedSourceIds.length === filteredSources.length ? 'Deselect All' : 'Select All Filtered'}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget({ type: 'source', ids: selectedSourceIds })}>
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleConsolidate()} isLoading={isConsolidating} className="bg-blue-600 hover:bg-blue-700">
                          <Layers className="w-4 h-4 mr-2" />
                          Consolidate
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSources.map((source: AgoraCurriculumSource) => (
                      <Card
                        key={source.id}
                        onMouseDown={() => startLongPress(source.id)}
                        onMouseUp={(e) => endLongPress(e, source.id)}
                        onMouseLeave={() => {
                          if (touchTimer.current) {
                            clearTimeout(touchTimer.current);
                            touchTimer.current = null;
                          }
                        }}
                        onTouchStart={() => startLongPress(source.id)}
                        onTouchEnd={(e) => endLongPress(e, source.id)}
                        className={cn(
                          "group transition-all border hover:shadow-md relative cursor-pointer select-none",
                          selectedSourceIds.includes(source.id)
                            ? "border-red-500 shadow-md ring-2 ring-red-500/20"
                            : "border-light-border dark:border-dark-border"
                        )}
                      >
                        <div
                          className="absolute top-3 right-3 z-10 cursor-pointer"
                        >
                          {(selectedSourceIds.includes(source.id) || selectedSourceIds.length > 0) && (
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                              selectedSourceIds.includes(source.id)
                                ? "bg-red-600 border-red-600 text-white"
                                : "border-gray-300 dark:border-gray-600 hover:border-red-400"
                            )}>
                              {selectedSourceIds.includes(source.id) && <Check className="w-3.5 h-3.5" />}
                            </div>
                          )}

                          {source.status === 'PARSED' && !selectedSourceIds.includes(source.id) && !curricula?.some(c => c.sourceIds?.includes(source.id)) && (
                            <Button
                              size="xs"
                              className="h-7 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchEnd={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConsolidate([source.id]);
                              }}
                            >
                              <Layers className="w-3 h-3 mr-1" />
                              Consolidate
                            </Button>
                          )}
                        </div>

                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start pr-8">
                            <CardTitle className="font-heading" style={{ fontSize: 'var(--text-card-title)' }}>
                              {source.subject?.name || 'Unknown Subject'}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStatusBadge(source.status)}
                            <span className="text-gray-400">•</span>
                            <p className="font-medium text-light-text-secondary" style={{ fontSize: 'var(--text-tiny)' }}>Grade: {source.gradeLevel}</p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-light-text-muted mt-2 space-y-1 overflow-y-auto scrollbar-hide" style={{ fontSize: 'var(--text-tiny)', maxHeight: '100px' }}>
                            <p className="flex items-center gap-1.5"><Library className="w-3 h-3" /> {source.sourceType}</p>
                            {source.fileName && <p className="truncate flex items-center gap-1.5" title={source.fileName}><FileText className="w-3 h-3 shrink-0" /> {source.fileName}</p>}
                            <p className="text-red-600 dark:text-red-400 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view status & details →</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </FadeInUp>

        {/* Upload Modal */}
        <UploadSourceModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          subjects={subjects || []}
        />

        {/* Source Detail Modal */}
        {viewingSourceId && (
          <SourceDetailModal
            sourceId={viewingSourceId}
            isOpen={!!viewingSourceId}
            onClose={() => setViewingSourceId(null)}
            onSelect={(id) => {
              handleSelectSource(id);
              setViewingSourceId(null);
            }}
            onDelete={(id) => setDeleteTarget({ type: 'source', ids: [id] })}
            isSelected={selectedSourceIds.includes(viewingSourceId)}
          />
        )}

        {/* Curriculum Preview Modal */}
        {previewCurriculumId && (
          <CurriculumPreviewModal
            curriculumId={previewCurriculumId}
            isOpen={!!previewCurriculumId}
            onClose={() => setPreviewCurriculumId(null)}
            onDelete={(id) => setDeleteTarget({ type: 'curriculum', ids: [id] })}
          />
        )}

        {/* Deletion Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeBulkDelete}
          isLoading={isBulkDeleting}
          title="Confirm Deletion"
          message={`Are you sure you want to delete ${deleteTarget?.ids.length || 0} ${deleteTarget?.type}(s)? This action cannot be undone.`}
        />
      </div>
    </ProtectedRoute>
  );
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
  variant = 'danger'
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4",
            variant === 'danger' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          )}>
            {variant === 'danger' ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
            isLoading={isLoading}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Inline Upload Modal component to keep it grouped for now
function UploadSourceModal({
  isOpen,
  onClose,
  subjects
}: {
  isOpen: boolean;
  onClose: () => void;
  subjects: any[];
}) {
  const [subjectId, setSubjectId] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['SS_1']);
  const [customGrade, setCustomGrade] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadMultiple, { isLoading }] = useUploadMultipleAgoraCurriculumSourcesMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file =>
        file.type === 'application/pdf' || file.name.endsWith('.doc') || file.name.endsWith('.docx')
      );
      if (newFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newFiles]);
      } else {
        toast.error('Only PDF and Word documents are supported.');
      }
    }
  };

  const commonGrades = [
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
  ];

  const toggleGrade = (val: string) => {
    setSelectedGrades(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalGrades = [...selectedGrades];
    if (customGrade) finalGrades.push(customGrade.toUpperCase().replace(/\s+/g, '_'));

    if (!subjectId || selectedFiles.length === 0 || finalGrades.length === 0) {
      toast.error('Subject, at least one File, and at least one Grade Level are required');
      return;
    }

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('subjectId', subjectId);
      formData.append('gradeLevel', finalGrades.join(', '));
      formData.append('sourceType', 'FILE_UPLOAD');

      await uploadMultiple(formData).unwrap();

      toast.success(`${selectedFiles.length} files uploaded! Batch process started.`);
      onClose();
      // Reset form
      setSubjectId('');
      setSelectedGrades(['SS_1']);
      setCustomGrade('');
      setSelectedFiles([]);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to upload sources');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Curriculum Source" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary flex items-center justify-between" style={{ fontSize: 'var(--text-small)' }}>
                <span>1. Select Subject *</span>
                {Array.isArray(subjects) && subjects.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{subjects.length} loaded</span>}
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-4 py-2.5 border border-light-border dark:border-dark-border rounded-xl bg-light-surface dark:bg-[#1a1f2e] text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              >
                <option value="">Choose a subject...</option>
                {Array.isArray(subjects) && subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
                2. Target Grade Levels *
              </label>
              <p className="text-gray-500 text-xs mb-3 italic">Tip: Select all grades that appear in this PDF. Lois will split them into separate curricula.</p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {commonGrades.map(grade => (
                  <button
                    key={grade.value}
                    type="button"
                    onClick={() => toggleGrade(grade.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                      selectedGrades.includes(grade.value)
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-light-surface dark:bg-[#1a1f2e] text-gray-600 dark:text-gray-400 border-light-border dark:border-dark-border hover:border-blue-400"
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
          </div>

          <div className="space-y-4">
            <label className="block font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>
              3. Upload Document *
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px]",
                selectedFiles.length > 0
                  ? "border-blue-500 bg-blue-50/10"
                  : "border-gray-200 dark:border-gray-800 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/20",
                isDragging && "border-blue-500 bg-blue-50/20 scale-[1.02]"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />

              {selectedFiles.length > 0 ? (
                <div className="w-full space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-xs font-medium truncate text-light-text-primary dark:text-dark-text-primary">{file.name}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[10px] text-blue-600 font-bold mt-2">+ Click or drop more files</p>
                </div>
              ) : (
                <>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform duration-300",
                    isDragging ? "bg-blue-600 text-white scale-110" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  )}>
                    <UploadIcon className={cn("w-6 h-6", isDragging && "animate-bounce")} />
                  </div>
                  <p className="font-bold text-xs mb-1 text-light-text-primary dark:text-dark-text-primary">
                    {isDragging ? 'Drop them here!' : 'Click or Drag Multiple PDFs'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-normal">Word or PDF. Max 20MB per file.</p>
                </>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
                By selecting multiple grades, you are telling the AI to look for specific curriculum content for each level within this one file.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-light-border dark:border-dark-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl px-6">Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="rounded-xl px-8 shadow-lg shadow-blue-500/20">
            Upload & Start Batch Processing
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SourceDetailModal({
  sourceId,
  isOpen,
  onClose,
  onSelect,
  onDelete,
  isSelected
}: {
  sourceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
}) {
  const { data: source, isLoading, refetch } = useGetSourceStatusQuery(sourceId, {
    pollingInterval: 5000,
    skip: !isOpen
  });

  const [cancelProcessing, { isLoading: isCancelling }] = useCancelAgoraCurriculumProcessingMutation();

  const handleDelete = () => {
    onDelete(sourceId);
  };

  const handleCancel = async () => {
    try {
      await cancelProcessing(sourceId).unwrap();
      toast.success("Job cancellation requested");
      refetch();
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  if (isLoading && !source) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Source Details">
        <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
      </Modal>
    );
  }

  const stages = [
    { name: 'Upload', status: 'completed', icon: <UploadIcon /> },
    {
      name: 'Parsing',
      status: source?.status === 'PARSED' ? 'completed' : source?.status === 'FAILED' ? 'failed' : source?.status === 'PARSING' ? 'processing' : 'pending',
      icon: <Terminal />
    },
    {
      name: 'Structuring',
      status: source?.status === 'PARSED' ? 'completed' : source?.status === 'FAILED' ? 'failed' : 'pending',
      icon: <FileJson />
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Curriculum Source Status" size="xl">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary">
              {source?.subject?.name || 'Curriculum Document'}
            </h3>
            <p className="text-sm text-gray-500">Source ID: {sourceId.substring(0, 8)}... • Grade: {source?.gradeLevel}</p>
          </div>
          <div className="flex items-center gap-3">
            {source?.status === 'PARSED' && (
              <Button
                variant={isSelected ? "outline" : "primary"}
                size="sm"
                onClick={() => onSelect(sourceId)}
                className="rounded-xl"
              >
                {isSelected ? 'Deselect' : 'Select for Consolidation'}
              </Button>
            )}
          </div>
        </div>

        <div className="relative flex justify-between px-4 pb-8">
          {stages.map((stage, idx) => (
            <div key={stage.name} className="flex flex-col items-center relative z-10 basis-1/3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-500",
                stage.status === 'completed' ? "bg-green-500 border-green-500 text-white" :
                  stage.status === 'processing' ? "bg-blue-600 border-blue-600 text-white animate-pulse" :
                    stage.status === 'failed' ? "bg-red-500 border-red-500 text-white" :
                      "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400"
              )}>
                {stage.status === 'completed' ? <Check className="w-5 h-5" /> : React.cloneElement(stage.icon as React.ReactElement, { className: "w-5 h-5" })}
              </div>
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                stage.status === 'completed' ? "text-green-600" :
                  stage.status === 'processing' ? "text-blue-600" :
                    stage.status === 'failed' ? "text-red-600" :
                      "text-gray-400"
              )}>{stage.name}</span>

              {idx < stages.length - 1 && (
                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-100 dark:bg-gray-800 -z-10">
                  <div className={cn(
                    "h-full bg-green-500 transition-all duration-1000",
                    stage.status === 'completed' ? "w-full" : "w-0"
                  )} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
              <Info className="w-4 h-4" /> Metadata
            </h4>
            <Card className="bg-transparent border-gray-100 dark:border-gray-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">File Name</span>
                  <span className="font-medium truncate max-w-[150px]">{source?.fileName || 'Manual Entry'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{source?.sourceType}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Created At</span>
                  <span className="font-medium">{source?.createdAt ? new Date(source.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                {source?.fileUrl && (
                  <div className="pt-2">
                    <a
                      href={source.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Original File
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Lois Output Logs
            </h4>
            <div className="max-h-[300px] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {source?.status === 'FAILED' ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl">
                  <p className="text-xs text-red-800 dark:text-red-400 font-mono whitespace-pre-wrap">
                    {source?.parseErrors || 'An unknown error occurred during parsing.'}
                  </p>
                </div>
              ) : source?.status === 'PARSED' ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl">
                  <p className="text-xs text-green-800 dark:text-green-400 font-medium">
                    Success! Lois has extracted {source?.parsedData?.topics?.length || 0} topics/weeks from this source.
                  </p>
                  <div className="mt-2 text-[10px] text-green-700/60 font-mono">
                    {JSON.stringify(source?.parsedData || {}, null, 2)}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-20" />
                  <p className="text-xs italic">
                    {source?.status === 'PENDING_PARSE'
                      ? (source?.queuePosition ? `Queued at position #${source.queuePosition}` : 'Waiting for available worker...')
                      : (source?.jobProgress?.step || 'Waiting for Lois processing results...')}
                  </p>
                  {(source?.jobProgress?.step || source?.status === 'PENDING_PARSE') && (
                    <p className="text-[10px] mt-2 text-blue-500/60 font-medium">This typically takes 30-60 seconds</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            {(source?.status === 'PENDING_PARSE' || source?.status === 'PARSING') && (
              <Button
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Cancel AI Job
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Source
            </Button>
          </div>
          <Button variant="outline" onClick={onClose} className="min-w-[100px]">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CurriculumPreviewModal({
  curriculumId,
  isOpen,
  onClose,
  onDelete,
}: {
  curriculumId: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [isPolling, setIsPolling] = useState(false);
  const { data: curriculum, isLoading } = useGetAgoraCurriculumQuery(curriculumId, {
    skip: !isOpen,
    pollingInterval: isPolling ? 3000 : 0
  });

  useEffect(() => {
    setIsPolling(isOpen && (!curriculum?.topics || curriculum.topics.length === 0));
  }, [isOpen, curriculum]);

  const [updateTopic] = useUpdateAgoraCurriculumTopicMutation();
  const [addTopic] = useAddAgoraCurriculumTopicMutation();
  const [deleteTopic] = useDeleteAgoraCurriculumTopicMutation();
  const [publishCurriculum, { isLoading: isPublishing }] = usePublishAgoraCurriculumMutation();

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    subTopics: '',
    learningOutcomes: '',
    term: 1
  });

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'scheme'>('overview');
  const [activeTerm, setActiveTerm] = useState<number>(1);

  const renderOverviewContent = (notes: string) => {
    if (!notes) return <p className="text-xs font-bold text-gray-400 italic">No consolidation notes available for this curriculum.</p>;

    try {
      // Handle legacy/new structured format
      const isJson = notes.startsWith('{');
      const data = isJson ? JSON.parse(notes) : null;

      const getDescription = () => isJson ? data.description : notes.split('# Description')[1]?.split('# Themes')[0]?.trim();
      const getThemes = () => isJson ? data.themes : notes.split('# Themes')[1]?.split('# Progression Notes')[0]?.trim();
      const getProgression = () => isJson ? data.progressionNotes : notes.split('# Progression Notes')[1]?.trim();

      const themes = getThemes();
      const themesList = Array.isArray(themes) ? themes : themes?.split('\n').map((t: string) => t.replace(/^- /, '').trim()).filter(Boolean);

      return (
        <div className="space-y-10 max-w-4xl mx-auto">
          {/* Document Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 pb-10 border-b border-light-border dark:border-dark-border/50">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em]">Subject</span>
                <p className="text-lg font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">{curriculum?.subject?.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">Class</span>
                <p className="text-lg font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">{curriculum?.gradeLevel?.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-500 tracking-[0.2em]">Level</span>
                <p className="text-lg font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">
                  {curriculum?.gradeLevel?.startsWith('PRY') ? 'Primary' : curriculum?.gradeLevel?.startsWith('JSS') ? 'Junior Secondary' : 'Senior Secondary'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-agora-success tracking-[0.2em]">Duration</span>
                <p className="text-lg font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">3 Terms × 13 Weeks = 39 Weeks</p>
              </div>
            </div>
          </div>

          {/* Narrative Content */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-light-text-primary dark:text-dark-text-primary tracking-widest flex items-center gap-3">
                <div className="w-8 h-[2px] bg-blue-500" /> Description
              </h4>
              <p className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary leading-loose text-justify italic opacity-90">
                {getDescription() || 'Detailed curriculum overview not generated yet.'}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-light-text-primary dark:text-dark-text-primary tracking-widest flex items-center gap-3">
                <div className="w-8 h-[2px] bg-amber-500" /> Themes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                {themesList?.map((theme: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="text-xs font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{theme}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-light-text-primary dark:text-dark-text-primary tracking-widest flex items-center gap-3">
                <div className="w-8 h-[2px] bg-purple-500" /> Progression Notes
              </h4>
              <div className="pl-11 pr-4 py-6 bg-purple-500/[0.03] dark:bg-purple-500/[0.05] rounded-3xl border border-purple-500/10">
                <p className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary leading-loose">
                  {getProgression() || 'No specific progression strategy defined for this subject yet.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (e) {
      return <p className="text-xs font-bold leading-loose whitespace-pre-wrap">{notes}</p>;
    }
  };

  const handleDelete = () => {
    onDelete(curriculumId);
  };
  const topicsEndRef = useRef<HTMLDivElement>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      topicsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };
  const handlePublishToggle = async () => {
    if (!curriculum) return;
    const nextStatus = curriculum.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try {
      await publishCurriculum({ id: curriculumId, data: { status: nextStatus } }).unwrap();
      toast.success(`Curriculum ${nextStatus.toLowerCase()} successfully`);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update publication status');
    }
  };

  const handleStartEdit = (topic: any) => {
    setEditingTopicId(topic.id);
    setEditData({
      title: topic.title,
      subTopics: (topic.subTopics || []).join(', '),
      learningOutcomes: (topic.learningOutcomes || []).join('\n'),
      term: topic.term || 1
    });
  };

  const handleSaveTopic = async (topicId: string) => {
    if (!editData.title) {
      toast.error("Title is required");
      return;
    }
    try {
      await updateTopic({
        topicId,
        data: {
          title: editData.title,
          subTopics: editData.subTopics.split(',').map(s => s.trim()).filter(Boolean),
          learningOutcomes: editData.learningOutcomes.split('\n').map(s => s.trim()).filter(Boolean),
          term: editData.term
        }
      }).unwrap();
      toast.success("Topic updated");
      setEditingTopicId(null);
    } catch {
      toast.error("Failed to update topic");
    }
  };

  const handleAddNewWeek = async () => {
    if (!curriculum) return;
    try {
      const nextWeekNum = (curriculum.topics?.filter((t: any) => t.term === activeTerm).length || 0) + 1;
      const newTopic = await addTopic({
        curriculumId,
        data: {
          title: `Week ${nextWeekNum}: [New Subject]`,
          weekNumber: nextWeekNum,
          subTopics: [],
          learningOutcomes: [],
          term: activeTerm
        }
      }).unwrap();

      toast.success("New week added");
      handleStartEdit(newTopic);
      scrollToBottom();
    } catch {
      toast.error("Failed to add new week");
    }
  };

  const executeDeleteTopic = async () => {
    if (!topicToDelete) return;
    setIsDeletingTopic(true);
    try {
      await deleteTopic(topicToDelete).unwrap();
      toast.success("Week removed");
      setTopicToDelete(null);
    } catch {
      toast.error("Failed to remove week");
    } finally {
      setIsDeletingTopic(false);
    }
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading..." size="xl">
        <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
      </Modal>
    );
  }

  if (!curriculum) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${curriculum.subject?.name || 'Curriculum'} (${curriculum.gradeLevel})`} size="xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Version</p>
              <p className="font-semibold select-none">v{curriculum.version}</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
              <Badge className={curriculum.status === 'PUBLISHED' ? "bg-green-100 text-green-800" : "bg-琥珀-100 text-琥珀-800"}>
                {curriculum.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash className="w-4 h-4 mr-2" /> Delete Draft
            </Button>
            <Button
              variant="primary"
              onClick={handlePublishToggle}
              isLoading={isPublishing}
              className="rounded-xl px-8"
            >
              {curriculum.status === 'DRAFT' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              {curriculum.status === 'DRAFT' ? 'Publish Curriculum' : 'Revert to Draft'}
            </Button>
          </div>
        </div>

        <div className="flex border-b border-light-border dark:border-dark-border">
          <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={cn(
                "relative px-4 py-2 text-xs uppercase tracking-widest transition-all",
                activeSubTab === 'overview'
                  ? "text-blue-500"
                  : "text-light-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
              )}
            >
              Curriculum
              {activeSubTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('scheme')}
              className={cn(
                "relative px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                activeSubTab === 'scheme'
                  ? "text-blue-500"
                  : "text-light-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
              )}
            >
              Scheme of Work
              {activeSubTab === 'scheme' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {activeSubTab === 'overview' ? (
          <div className="p-10 bg-light-card dark:bg-dark-surface rounded-[2.5rem] border border-light-border dark:border-dark-border/50 shadow-sm relative overflow-hidden group min-h-[500px]">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity pointer-events-none">
              <Sparkles className="w-64 h-64 text-blue-500" />
            </div>

            <div className="relative z-10 space-y-10">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-600">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Session Master Curriculum</span>
                </div>
              </div>

              {renderOverviewContent(curriculum.consolidationNotes || '')}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-light-border dark:border-dark-border">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-[0.1em] text-light-text-primary dark:text-dark-text-primary">
                  Weekly Topic Breakdown
                </h4>
                <p className="text-[10px] font-bold text-light-text-muted">Partitioned by Nigerian Academic Terms (1-3)</p>
              </div>
              <div className="flex gap-2 p-1.5 bg-gray-200/50 dark:bg-gray-900 rounded-xl border border-light-border dark:border-dark-border">
                {[1, 2, 3].map(term => (
                  <button
                    key={term}
                    onClick={() => setActiveTerm(term)}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      activeTerm === term ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    Term {term}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={handleAddNewWeek} className="rounded-xl px-5">
                <Plus className="w-4 h-4 mr-2" /> Add Week to Term {activeTerm}
              </Button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pb-8">
              {curriculum.topics?.filter((t: any) => t.term === activeTerm).sort((a: any, b: any) => a.weekNumber - b.weekNumber).map((topic: any) => (
                <div key={topic.id} className="p-5 bg-light-surface dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-bold rounded-lg uppercase tracking-widest">Week {topic.weekNumber}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setTopicToDelete(topic.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-500 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {editingTopicId === topic.id ? (
                        <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Week Title</label>
                              <Input
                                value={editData.title}
                                onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter week title..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Term</label>
                              <Select
                                value={editData.term}
                                onChange={e => setEditData(prev => ({ ...prev, term: parseInt(e.target.value) }))}
                              >
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Subtopics (comma separated)</label>
                            <Input
                              value={editData.subTopics}
                              onChange={e => setEditData(prev => ({ ...prev, subTopics: e.target.value }))}
                              placeholder="Algebra, Equations, Functions..."
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Learning Outcomes (one per line)</label>
                            <textarea
                              rows={3}
                              value={editData.learningOutcomes}
                              onChange={e => setEditData(prev => ({ ...prev, learningOutcomes: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded-xl bg-white dark:bg-[#131824] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="Students will be able to..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveTopic(topic.id)}>Save Changes</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTopicId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative group/title">
                          <h4 className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                            {topic.title}
                            <button onClick={() => handleStartEdit(topic)} className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 hover:bg-blue-50 rounded">
                              <Edit2 className="w-4 h-4 text-blue-500" />
                            </button>
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                <div className="w-1 h-1 bg-blue-500 rounded-full" /> Subtopics
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {topic.subTopics?.length > 0 ? topic.subTopics.map((st: string, i: number) => (
                                  <span key={i} className="text-[11px] px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700">
                                    {st}
                                  </span>
                                )) : <p className="text-[11px] text-gray-400 italic">No subtopics defined</p>}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                <div className="w-1 h-1 bg-green-500 rounded-full" /> Learning Outcomes
                              </span>
                              <ul className="space-y-1.5">
                                {topic.learningOutcomes?.length > 0 ? topic.learningOutcomes.map((lo: string, i: number) => (
                                  <li key={i} className="flex gap-2 items-start text-xs text-gray-600 dark:text-gray-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-1">
                                      <div className="w-0.5 h-0.5 rounded-full bg-green-500" />
                                    </div>
                                    <span>{lo}</span>
                                  </li>
                                )) : <p className="text-[11px] text-gray-400 italic">No outcomes defined</p>}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!curriculum.topics || curriculum.topics.filter((t: any) => t.term === activeTerm).length === 0) && (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300 opacity-50" />
                  <h4 className="font-bold text-gray-400">No topics for Term {activeTerm}</h4>
                  <p className="text-xs text-gray-400 mt-2">Lois might still be consolidating or no content was found for this term.</p>
                </div>
              )}
              <div ref={topicsEndRef} />
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={!!topicToDelete}
          onClose={() => setTopicToDelete(null)}
          onConfirm={executeDeleteTopic}
          isLoading={isDeletingTopic}
          title="Remove Week"
          message="Are you sure you want to delete this week? All subtopics and outcomes for this week will be permanently removed."
        />
      </div>
    </Modal>
  );
}
