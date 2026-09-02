'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar as RBCalendar, View, SlotInfo, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CustomToolbar } from '@/components/calendar/CustomToolbar';
import { CustomEvent } from '@/components/calendar/CustomEvent';
import { CompactEventCard } from '@/components/calendar/CompactEventCard';
import { CreateEventModal } from '@/components/modals/CreateEventModal';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useImportNigerianHolidaysMutation,
  useGetTimetablesForSchoolTypeQuery,
  useGetClassArmsQuery,
  useGetRoomsQuery,
  type CalendarEvent,
  type CalendarEventType,
  type AcademicSession,
  type Term,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useWorkingDays } from '@/hooks/useRuntimePolicies';
import {
  buildHalfTermRange,
  holidayRangesFromEvents,
  isInstructionalDay,
} from '@/lib/calendar/instructionalDays';
import toast from 'react-hot-toast';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { Calendar as CalendarIcon, X, MapPin, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Create date-fns localizer
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEventWithType {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type:
    | CalendarEventType
    | 'TIMETABLE'
    | 'SESSION_START'
    | 'SESSION_END'
    | 'TERM_START'
    | 'TERM_END'
    | 'HALF_TERM'
    | 'MIDTERM'
    | 'EXAM_PERIOD';
  schoolType?: string;
  location?: string;
  roomId?: string;
  roomName?: string;
  schoolId: string;
  createdBy?: string;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
  start: Date;
  end: Date;
  allDay?: boolean; // For react-big-calendar all-day event support
}

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | undefined>();
  // F4: term selector
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  // F5: event type legend filters
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  // F6: event detail modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithType | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);

  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();
  const workingDays = useWorkingDays();

  const [importHolidays, { isLoading: isImportingHolidays }] = useImportNigerianHolidaysMutation();

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get all sessions to display session/term milestones
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );
  const allSessions = sessionsResponse?.data || [];

  // F4: derive all terms for the term selector
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];
    return sessionsResponse.data
      .flatMap((session) =>
        session.terms.map((term: Term) => ({
          ...term,
          sessionName: session.name,
        }))
      )
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [sessionsResponse]);

  // Calculate date range for events query
  const dateRange = useMemo(() => {
    const date = new Date(currentDate);
    if (view === 'week') {
      const start = startOfWeek(date, { locale: enUS });
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (view === 'day') {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // Month view: extend to cover full 6-week grid react-big-calendar renders
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    // Go back to Sunday of the first week
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday
    start.setHours(0, 0, 0, 0);
    // Go forward to Saturday of the last week
    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay())); // forward to Saturday
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [currentDate, view]);

  const { data: eventsResponse } = useGetEventsQuery(
    {
      schoolId: schoolId!,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      schoolType: currentType || undefined,
    },
    { skip: !schoolId }
  );

  const { data: classArmsResponse } = useGetClassArmsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );

  const { data: roomsResponse } = useGetRoomsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdatingEvent }] = useUpdateEventMutation();
  const [deleteEvent, { isLoading: isDeletingEvent }] = useDeleteEventMutation();

  const events = eventsResponse?.data || [];
  const classArms = classArmsResponse?.data || [];
  const rooms = roomsResponse?.data || [];

  // Get all timetable periods for the school type (for recurring slots)
  const effectiveTermId = selectedTermId
    ? (allTerms.find((t) => t.id === selectedTermId)?.id)
    : activeSession?.term?.id;

  const { data: timetablesResponse } = useGetTimetablesForSchoolTypeQuery(
    {
      schoolId: schoolId!,
      schoolType: currentType || undefined,
      termId: effectiveTermId || undefined,
    },
    { skip: !schoolId || !effectiveTermId }
  );
  const timetablesByClass = timetablesResponse?.data || {};

  // Combine events, timetable periods, and session/term milestones into calendar events
  const calendarEvents = useMemo<CalendarEventWithType[]>(() => {
    const combined: CalendarEventWithType[] = [];

    // Add one-off events
    events.forEach((event) => {
      combined.push({
        ...event,
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        type: event.type as CalendarEventType,
        allDay: event.isAllDay,
      });
    });

    // Add session and term milestones
    allSessions.forEach((session: AcademicSession) => {
      // Session start
      combined.push({
        id: `session-start-${session.id}`,
        title: `Session Start: ${session.name}`,
        startDate: new Date(session.startDate).toISOString(),
        endDate: new Date(session.startDate).toISOString(),
        type: 'SESSION_START' as const,
        schoolId: schoolId!,
        isAllDay: true,
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
        start: new Date(session.startDate),
        end: new Date(session.startDate),
        allDay: true,
      });

      // Session end
      combined.push({
        id: `session-end-${session.id}`,
        title: `Session End: ${session.name}`,
        startDate: new Date(session.endDate).toISOString(),
        endDate: new Date(session.endDate).toISOString(),
        type: 'SESSION_END' as const,
        schoolId: schoolId!,
        isAllDay: true,
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
        start: new Date(session.endDate),
        end: new Date(session.endDate),
        allDay: true,
      });

      // Term milestones
      session.terms.forEach((term: Term) => {
        // Term start
        combined.push({
          id: `term-start-${term.id}`,
          title: `Term Start: ${term.name}`,
          startDate: new Date(term.startDate).toISOString(),
          endDate: new Date(term.startDate).toISOString(),
          type: 'TERM_START' as const,
          schoolId: schoolId!,
          isAllDay: true,
          createdAt: term.createdAt,
          updatedAt: term.createdAt,
          start: new Date(term.startDate),
          end: new Date(term.startDate),
          allDay: true,
        });

        // Term end
        combined.push({
          id: `term-end-${term.id}`,
          title: `Term End: ${term.name}`,
          startDate: new Date(term.endDate).toISOString(),
          endDate: new Date(term.endDate).toISOString(),
          type: 'TERM_END' as const,
          schoolId: schoolId!,
          isAllDay: true,
          createdAt: term.createdAt,
          updatedAt: term.createdAt,
          start: new Date(term.endDate),
          end: new Date(term.endDate),
          allDay: true,
        });

        // Half-term break (if exists)
        if (term.halfTermStart && term.halfTermEnd) {
          combined.push({
            id: `half-term-${term.id}`,
            title: `Half-Term Break: ${term.name}`,
            startDate: new Date(term.halfTermStart).toISOString(),
            endDate: new Date(term.halfTermEnd).toISOString(),
            type: 'HALF_TERM' as const,
            schoolId: schoolId!,
            isAllDay: true,
            createdAt: term.createdAt,
            updatedAt: term.createdAt,
            start: new Date(term.halfTermStart),
            end: new Date(term.halfTermEnd),
            allDay: true,
          });
        }

        if (term.midtermStart && term.midtermEnd) {
          combined.push({
            id: `midterm-${term.id}`,
            title: `Midterm tests: ${term.name}`,
            startDate: new Date(term.midtermStart).toISOString(),
            endDate: new Date(term.midtermEnd).toISOString(),
            type: 'MIDTERM' as const,
            schoolId: schoolId!,
            isAllDay: true,
            createdAt: term.createdAt,
            updatedAt: term.createdAt,
            start: new Date(term.midtermStart),
            end: new Date(term.midtermEnd),
            allDay: true,
          });
        }

        if (term.examStart && term.examEnd) {
          combined.push({
            id: `exam-period-${term.id}`,
            title: `Exams: ${term.name}`,
            startDate: new Date(term.examStart).toISOString(),
            endDate: new Date(term.examEnd).toISOString(),
            type: 'EXAM_PERIOD' as const,
            schoolId: schoolId!,
            isAllDay: true,
            createdAt: term.createdAt,
            updatedAt: term.createdAt,
            start: new Date(term.examStart),
            end: new Date(term.examEnd),
            allDay: true,
          });
        }
      });
    });

    const holidayRanges = holidayRangesFromEvents(events);
    const halfTermRanges = allSessions.flatMap((session: AcademicSession) =>
      session.terms
        .map((term: Term) => buildHalfTermRange(term.halfTermStart, term.halfTermEnd))
        .filter(Boolean),
    );
    const nonInstructionalRanges = [...holidayRanges, ...halfTermRanges];

    // Add recurring timetable periods — only on instructional days
    if (activeSession?.term && timetablesByClass) {
      const termRange = {
        start: new Date(activeSession.term.startDate),
        end: new Date(activeSession.term.endDate),
      };

      // Iterate through all classes and their timetable periods
      Object.entries(timetablesByClass).forEach(([classId, periods]) => {
        periods.forEach((period) => {
          // Convert dayOfWeek and time to actual dates for the current view range
          const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
          const dayIndex = dayNames.indexOf(period.dayOfWeek);

          // Get all dates for this day in the current view range
          const dates: Date[] = [];
          let current = new Date(dateRange.start);
          while (current <= dateRange.end) {
            if (current.getDay() === dayIndex) {
              dates.push(new Date(current));
            }
            current = addDays(current, 1);
          }

          dates.forEach((date) => {
            if (
              !isInstructionalDay(date, {
                workingDays,
                termRange,
                nonInstructionalRanges,
              })
            ) {
              return;
            }

            const [startHour, startMin] = period.startTime.split(':').map(Number);
            const [endHour, endMin] = period.endTime.split(':').map(Number);

            const start = new Date(date);
            start.setHours(startHour, startMin, 0, 0);

            const end = new Date(date);
            end.setHours(endHour, endMin, 0, 0);

            combined.push({
              id: `timetable-${period.id}-${date.toISOString()}`,
              title: period.subjectName || period.classArmName || 'Timetable Period',
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              type: 'TIMETABLE' as const,
              location: period.roomName,
              roomName: period.roomName,
              schoolId: schoolId!,
              isAllDay: false,
              createdAt: period.createdAt,
              updatedAt: period.createdAt,
              start,
              end,
            });
          });
        });
      });
    }

    return combined;
  }, [events, timetablesByClass, dateRange, activeSession, schoolId, allSessions, workingDays]);

  // F3: Derive sidebar events from already-fetched events — no extra request needed
  const sidebarEvents = useMemo(() => {
    const now = new Date();
    const isCurrentMonth =
      currentDate.getFullYear() === now.getFullYear() &&
      currentDate.getMonth() === now.getMonth();

    let filtered = [...events];
    if (isCurrentMonth) {
      // Only show future events when viewing the current month
      filtered = filtered.filter((e) => new Date(e.startDate) >= now);
    }
    return filtered
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 8);
  }, [events, currentDate]);

  const sidebarTitle = useMemo(() => {
    const now = new Date();
    const isCurrentMonth =
      currentDate.getFullYear() === now.getFullYear() &&
      currentDate.getMonth() === now.getMonth();
    if (isCurrentMonth) return 'Upcoming Events';
    return `Events — ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
  }, [currentDate]);

  // F5: filter calendarEvents to exclude hidden types
  const toggleType = (type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const visibleCalendarEvents = useMemo(
    () => calendarEvents.filter((e) => !hiddenTypes.has(e.type)),
    [calendarEvents, hiddenTypes]
  );

  // F6: event click handler — only real DB events (not synthesized milestones)
  const handleSelectEvent = useCallback((event: CalendarEventWithType) => {
    if (
      event.type === 'TIMETABLE' ||
      event.type === 'SESSION_START' ||
      event.type === 'SESSION_END'
    )
      return;
    setSelectedEvent(event);
    setShowEventDetailModal(true);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setShowCreateEventModal(true);
  }, []);

  const handleCreateEvent = async (data: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    type: CalendarEventType;
    location?: string;
    roomId?: string;
    isAllDay: boolean;
  }) => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    try {
      await createEvent({
        schoolId,
        data: {
          ...data,
          schoolType: currentType || undefined,
        },
      }).unwrap();
      toast.success('Event created successfully');
      setShowCreateEventModal(false);
      setSelectedSlot(undefined);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create event');
    }
  };

  const handleImportHolidays = useCallback(async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }
    try {
      const result = await importHolidays({
        schoolId,
        schoolType: currentType || undefined,
        startDate: activeSession?.session?.startDate,
        endDate: activeSession?.session?.endDate,
      }).unwrap();
      const created = result.data?.created ?? 0;
      const skipped = result.data?.skipped ?? 0;
      if (created === 0 && skipped > 0) {
        toast.success('Public holidays already on the calendar');
      } else {
        toast.success(
          `Imported ${created} holiday(s)${skipped ? ` (${skipped} already present)` : ''}`,
        );
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to import holidays');
    }
  }, [schoolId, importHolidays, currentType, activeSession]);

  useEffect(() => {
    if (searchParams.get('action') === 'import-holidays' && schoolId) {
      void handleImportHolidays();
    }
  }, [searchParams, schoolId, handleImportHolidays]);

  const eventStyleGetter = (event: CalendarEventWithType) => {
    const colors: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {
      ACADEMIC: {
        backgroundColor: '#dbeafe',
        borderColor: '#3b82f6',
        color: '#1e40af',
      },
      EVENT: {
        backgroundColor: '#dcfce7',
        borderColor: '#10b981',
        color: '#065f46',
      },
      EXAM: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        color: '#991b1b',
      },
      MEETING: {
        backgroundColor: '#f3e8ff',
        borderColor: '#a855f7',
        color: '#6b21a8',
      },
      HOLIDAY: {
        backgroundColor: '#f3f4f6',
        borderColor: '#6b7280',
        color: '#374151',
      },
      TIMETABLE: {
        backgroundColor: '#e0e7ff',
        borderColor: '#6366f1',
        color: '#312e81',
      },
      SESSION_START: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        color: '#92400e',
      },
      SESSION_END: {
        backgroundColor: '#fee2e2',
        borderColor: '#dc2626',
        color: '#991b1b',
      },
      TERM_START: {
        backgroundColor: '#d1fae5',
        borderColor: '#10b981',
        color: '#065f46',
      },
      TERM_END: {
        backgroundColor: '#fce7f3',
        borderColor: '#ec4899',
        color: '#9f1239',
      },
      HALF_TERM: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        color: '#92400e',
      },
      MIDTERM: {
        backgroundColor: '#ffedd5',
        borderColor: '#f97316',
        color: '#9a3412',
      },
      EXAM_PERIOD: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        color: '#991b1b',
      },
    };

    const style = colors[event.type] || colors.EVENT;
    return {
      style: {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
        borderWidth: event.type?.includes('SESSION') || event.type?.includes('TERM') ? '3px' : '2px',
        borderRadius: '4px',
        fontWeight: event.type?.includes('SESSION') || event.type?.includes('TERM') ? '600' : 'normal',
      },
    };
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-2" style={{ fontSize: 'var(--text-page-title)' }}>
              Calendar
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
              Unified schedule: timetable, holidays, midterms, and exams
            </p>
          </div>
          <button
            type="button"
            onClick={handleImportHolidays}
            disabled={!schoolId || isImportingHolidays}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-sm font-medium text-light-text-primary dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {isImportingHolidays ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}
            Import Nigerian holidays
          </button>
        </div>

        {/* F4: Term selector */}
        {allTerms.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium">
              Jump to term:
            </span>
            <select
              value={selectedTermId}
              onChange={(e) => {
                const termId = e.target.value;
                setSelectedTermId(termId);
                if (termId) {
                  const term = allTerms.find((t) => t.id === termId);
                  if (term) setCurrentDate(new Date(term.startDate));
                }
              }}
              className="px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Current view</option>
              {allTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.sessionName} — {term.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Area (3/4 width) */}
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              {/* Event type legend — above calendar for easy reference */}
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { type: 'ACADEMIC', label: 'Academic', color: 'bg-blue-200 border-blue-400' },
                  { type: 'EVENT', label: 'Event', color: 'bg-green-200 border-green-400' },
                  { type: 'EXAM', label: 'Exam', color: 'bg-red-200 border-red-400' },
                  { type: 'MEETING', label: 'Meeting', color: 'bg-purple-200 border-purple-400' },
                  { type: 'HOLIDAY', label: 'Holiday', color: 'bg-gray-200 border-gray-400' },
                  { type: 'TIMETABLE', label: 'Timetable', color: 'bg-indigo-200 border-indigo-400' },
                  { type: 'TERM_START', label: 'Term Start', color: 'bg-emerald-200 border-emerald-400' },
                  { type: 'TERM_END', label: 'Term End', color: 'bg-pink-200 border-pink-400' },
                  { type: 'HALF_TERM', label: 'Half-Term', color: 'bg-amber-200 border-amber-400' },
                  { type: 'MIDTERM', label: 'Midterm tests', color: 'bg-orange-200 border-orange-400' },
                  { type: 'EXAM_PERIOD', label: 'Exam Period', color: 'bg-red-200 border-red-400' },
                ].map(({ type, label, color }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      hiddenTypes.has(type) ? 'opacity-40 line-through' : color
                    }`}
                    title={hiddenTypes.has(type) ? `Show ${label}` : `Hide ${label}`}
                  >
                    <span className={`w-2 h-2 rounded-full border ${color}`} />
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ height: '600px' }}>
                <RBCalendar
                  localizer={localizer as any}
                  events={visibleCalendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  view={view}
                  onView={setView}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                  }}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  className="rbc-custom-calendar"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sidebar: derived from already-fetched events (F3) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {sidebarTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sidebarEvents.length === 0 ? (
                <div className="text-center py-12">
                  <EmptyStateIcon type="statistics" />
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    No upcoming events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sidebarEvents.map((event) => (
                    <CompactEventCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      startDate={new Date(event.startDate)}
                      endDate={new Date(event.endDate)}
                      type={event.type as 'ACADEMIC' | 'EVENT' | 'EXAM' | 'MEETING' | 'HOLIDAY' | 'TIMETABLE'}
                      location={event.location}
                      roomName={event.roomName}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={showCreateEventModal}
          onClose={() => {
            setShowCreateEventModal(false);
            setSelectedSlot(undefined);
          }}
          onSubmit={handleCreateEvent}
          selectedSlot={selectedSlot}
          rooms={rooms}
          isLoading={isCreatingEvent}
          currentSchoolType={currentType}
        />

        {/* F6: Event Detail Modal */}
        {showEventDetailModal && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-light-border dark:border-dark-border">
                <h3 className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">
                  {selectedEvent.title}
                </h3>
                <button
                  onClick={() => setShowEventDetailModal(false)}
                  className="text-light-text-muted hover:text-light-text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-3 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {format(selectedEvent.start, 'PPP')}
                    {!selectedEvent.allDay &&
                      ` · ${format(selectedEvent.start, 'p')} – ${format(selectedEvent.end, 'p')}`}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {selectedEvent.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-light-border dark:border-dark-border">
                <button
                  onClick={async () => {
                    if (!schoolId) return;
                    try {
                      await deleteEvent({ schoolId, eventId: selectedEvent.id }).unwrap();
                      toast.success('Event deleted');
                      setShowEventDetailModal(false);
                    } catch {
                      toast.error('Failed to delete event');
                    }
                  }}
                  disabled={isDeletingEvent}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeletingEvent ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowEventDetailModal(false)}
                  className="px-3 py-1.5 text-sm text-light-text-secondary hover:text-light-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* Light Mode Styles */
        .rbc-custom-calendar {
          color: #1f2937;
        }
        .rbc-custom-calendar .rbc-header {
          border-bottom: 1px solid var(--light-border);
          padding: 10px 3px;
          font-weight: 600;
          color: #1f2937;
        }
        .rbc-custom-calendar .rbc-month-view,
        .rbc-custom-calendar .rbc-time-view {
          border-color: var(--light-border);
          background-color: white;
        }
        .rbc-custom-calendar .rbc-day-bg {
          border-color: var(--light-border);
          background-color: white;
        }
        .rbc-custom-calendar .rbc-month-row {
          border-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-time-slot {
          border-top-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-time-header-gutter {
          border-right-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-time-content {
          border-top-color: var(--light-border);
          background-color: white;
        }
        .rbc-custom-calendar .rbc-time-gutter {
          border-right-color: var(--light-border);
          color: #6b7280;
          background-color: #f9fafb;
        }
        .rbc-custom-calendar .rbc-day-slot .rbc-time-slot {
          border-top-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-timeslot-group {
          border-bottom-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-today {
          background-color: #2490FD !important;
        }
        .rbc-custom-calendar .rbc-today .rbc-day-bg {
          background-color: #2490FD !important;
        }
        .rbc-custom-calendar .rbc-today .rbc-date-cell,
        .rbc-custom-calendar .rbc-today .rbc-date-cell a {
          color: white !important;
        }
        .rbc-custom-calendar .rbc-current-time-indicator {
          background-color: #2563eb;
        }
        .rbc-custom-calendar .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .rbc-custom-calendar .rbc-off-range {
          color: #9ca3af;
        }
        .rbc-custom-calendar .rbc-date-cell {
          color: #1f2937;
          padding: 4px 8px;
        }
        .rbc-custom-calendar .rbc-label {
          color: #6b7280;
        }
        .rbc-custom-calendar .rbc-show-more {
          color: #3b82f6;
        }

        /* Dark Mode Styles */
        .dark .rbc-custom-calendar {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-header {
          border-bottom: 1px solid var(--dark-border);
          color: #f3f4f6 !important;
          background-color: var(--dark-surface);
        }
        .dark .rbc-custom-calendar .rbc-header span {
          color: #f3f4f6 !important;
        }
        .dark .rbc-custom-calendar .rbc-month-view,
        .dark .rbc-custom-calendar .rbc-time-view {
          border-color: var(--dark-border);
          background-color: var(--dark-surface);
        }
        .dark .rbc-custom-calendar .rbc-day-bg {
          border-color: var(--dark-border);
          background-color: var(--dark-surface);
        }
        .dark .rbc-custom-calendar .rbc-month-row {
          border-color: var(--dark-border);
        }
        .dark .rbc-custom-calendar .rbc-time-slot {
          border-top-color: var(--dark-border);
        }
        .dark .rbc-custom-calendar .rbc-time-header-gutter {
          border-right-color: var(--dark-border);
          background-color: var(--dark-surface);
        }
        .dark .rbc-custom-calendar .rbc-time-header-content {
          border-left-color: var(--dark-border);
        }
        .dark .rbc-custom-calendar .rbc-time-content {
          border-top-color: var(--dark-border);
          background-color: var(--dark-surface);
        }
        .dark .rbc-custom-calendar .rbc-time-gutter {
          border-right-color: var(--dark-border);
          color: #9ca3af;
          background-color: var(--dark-surface);
        }
        .dark .rbc-custom-calendar .rbc-time-gutter .rbc-timeslot-group {
          color: #9ca3af;
        }
        .dark .rbc-custom-calendar .rbc-day-slot .rbc-time-slot {
          border-top-color: var(--dark-border);
        }
        .dark .rbc-custom-calendar .rbc-timeslot-group {
          border-bottom-color: var(--dark-border);
        }
        .dark .rbc-custom-calendar .rbc-today {
          background-color: #2490FD !important;
        }
        .dark .rbc-custom-calendar .rbc-today .rbc-day-bg {
          background-color: #2490FD !important;
        }
        .dark .rbc-custom-calendar .rbc-today .rbc-date-cell,
        .dark .rbc-custom-calendar .rbc-today .rbc-date-cell a {
          color: white !important;
        }
        .dark .rbc-custom-calendar .rbc-current-time-indicator {
          background-color: #ef4444;
        }
        .dark .rbc-custom-calendar .rbc-off-range-bg {
          background-color: #0d1117;
        }
        .dark .rbc-custom-calendar .rbc-off-range {
          color: #6b7280;
        }
        .dark .rbc-custom-calendar .rbc-date-cell {
          color: #f3f4f6 !important;
          padding: 4px 8px;
        }
        .dark .rbc-custom-calendar .rbc-date-cell a {
          color: #f3f4f6 !important;
        }
        .dark .rbc-custom-calendar .rbc-date-cell.rbc-off-range {
          color: #6b7280 !important;
        }
        .dark .rbc-custom-calendar .rbc-date-cell.rbc-off-range a {
          color: #6b7280 !important;
        }
        .dark .rbc-custom-calendar .rbc-label {
          color: #9ca3af !important;
        }
        .dark .rbc-custom-calendar .rbc-allday-cell {
          background-color: #1f2937;
        }
        .dark .rbc-custom-calendar .rbc-row-bg {
          background-color: #111827;
        }
        .dark .rbc-custom-calendar .rbc-row-content {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-show-more {
          color: #60a5fa !important;
          background-color: #1f2937;
        }
        .dark .rbc-custom-calendar .rbc-event {
          border-width: 1px;
        }
        .dark .rbc-custom-calendar .rbc-event-content {
          color: inherit;
        }
        .dark .rbc-custom-calendar .rbc-toolbar {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-toolbar button {
          color: #f3f4f6;
          border-color: #4b5563;
          background-color: #1f2937;
        }
        .dark .rbc-custom-calendar .rbc-toolbar button:hover {
          background-color: #374151;
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .dark .rbc-custom-calendar .rbc-toolbar-label {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-btn-group button {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-agenda-view {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-agenda-view table {
          color: #f3f4f6;
        }
        .dark .rbc-custom-calendar .rbc-agenda-view table thead th {
          color: #f3f4f6;
          border-bottom-color: #4b5563;
        }
        .dark .rbc-custom-calendar .rbc-agenda-view table tbody td {
          color: #f3f4f6;
          border-bottom-color: #374151;
        }
        .dark .rbc-custom-calendar .rbc-agenda-date-cell,
        .dark .rbc-custom-calendar .rbc-agenda-time-cell {
          color: #9ca3af;
        }
        .dark .rbc-custom-calendar .rbc-agenda-event-cell {
          color: #f3f4f6;
        }
      `}</style>
    </ProtectedRoute>
  );
}
