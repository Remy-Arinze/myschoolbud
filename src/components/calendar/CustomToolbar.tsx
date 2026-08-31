'use client';

import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ToolbarProps } from 'react-big-calendar';
import { Select } from '@/components/ui/Select';

export function CustomToolbar<T extends object = object>({ label, onNavigate, onView, view }: ToolbarProps<T>) {
  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToToday = () => {
    onNavigate('TODAY');
  };

  const handleViewChange = (newView: 'month' | 'week' | 'day' | 'agenda') => {
    onView(newView);
  };

  return (
    <div className="flex items-center justify-between mb-4 p-4 bg-blue-50 dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border">
      <div className="flex items-center gap-3">
        <button
          onClick={goToBack}
          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5 text-[#2490FD] dark:text-[#2490FD]" />
        </button>
        <button
          onClick={goToNext}
          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5 text-[#2490FD] dark:text-[#2490FD]" />
        </button>
        <Button variant="primary" size="sm" onClick={goToToday}>
          Today
        </Button>
        <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary ml-4">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={view}
          onChange={(e) => handleViewChange(e.target.value as 'month' | 'week' | 'day' | 'agenda')}
          inline
          wrapperClassName="w-auto min-w-[140px]"
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
          <option value="agenda">Agenda</option>
        </Select>
      </div>
    </div>
  );
}

