'use client';

import { EventProps } from 'react-big-calendar';
import { Clock, MapPin } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'ACADEMIC' | 'EVENT' | 'EXAM' | 'MEETING' | 'HOLIDAY' | 'TIMETABLE' | 'SESSION_START' | 'SESSION_END' | 'TERM_START' | 'TERM_END' | 'HALF_TERM' | 'MIDTERM' | 'EXAM_PERIOD';
  location?: string;
  roomName?: string;
  resource?: any;
}

const eventTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  ACADEMIC: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-900 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  EVENT: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    text: 'text-green-900 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  EXAM: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-900 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  MEETING: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-900 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  HOLIDAY: {
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    text: 'text-gray-900 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
  TIMETABLE: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-900 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  SESSION_START: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    text: 'text-yellow-900 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700 border-2',
  },
  SESSION_END: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-900 dark:text-red-200',
    border: 'border-red-400 dark:border-red-600 border-2',
  },
  TERM_START: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-900 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700 border-2',
  },
  TERM_END: {
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    text: 'text-pink-900 dark:text-pink-300',
    border: 'border-pink-300 dark:border-pink-700 border-2',
  },
  HALF_TERM: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-900 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700 border-2',
  },
  MIDTERM: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-900 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700 border-2',
  },
  EXAM_PERIOD: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-900 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700 border-2',
  },
};

export function CustomEvent({ event }: EventProps<CalendarEvent>) {
  const colors = eventTypeColors[event.type] || eventTypeColors.EVENT;
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Check if this is an all-day milestone event
  const isMilestone = event.type?.includes('SESSION') || event.type?.includes('TERM') || event.type === 'HALF_TERM';
  const isAllDay = isMilestone || (event.start.getHours() === 0 && event.start.getMinutes() === 0 && 
    event.end.getHours() === 23 && event.end.getMinutes() === 59);

  return (
    <div
      className={`p-2 rounded border ${colors.bg} ${colors.border} ${colors.text} text-xs h-full overflow-hidden ${
        isMilestone ? 'font-semibold' : ''
      }`}
    >
      <div className={`mb-1 truncate ${isMilestone ? 'font-bold' : 'font-semibold'}`}>{event.title}</div>
      {!isAllDay && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(event.start)}</span>
          </div>
          {(event.location || event.roomName) && (
            <div className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />
              <span>{event.roomName || event.location}</span>
            </div>
          )}
        </div>
      )}
      {isAllDay && (event.location || event.roomName) && (
        <div className="flex items-center gap-1 truncate mt-1">
          <MapPin className="h-3 w-3" />
          <span>{event.roomName || event.location}</span>
        </div>
      )}
    </div>
  );
}

