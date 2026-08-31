'use client';

import { useRef, useState, useEffect, useId, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import 'react-day-picker/dist/style.css';

export interface DatePickerProps {
  /** Value in YYYY-MM-DD format (for form state) */
  value: string;
  /** Called with YYYY-MM-DD when date changes */
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  /** Min date YYYY-MM-DD */
  min?: string;
  /** Max date YYYY-MM-DD */
  max?: string;
  wrapperClassName?: string;
  /** Display format for the trigger (default MMM d, yyyy) */
  displayFormat?: string;
}

const DISPLAY_FORMAT = 'MMM d, yyyy';
const VALUE_FORMAT = 'yyyy-MM-dd';
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const selectClassName = cn(
  'flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm',
  'border-light-border dark:border-dark-border',
  'text-light-text-primary dark:text-dark-text-primary',
  '[background-color:var(--input-field-bg)]',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
);

function getYearRange(minDate?: Date, maxDate?: Date): number[] {
  const fromYear = (minDate ?? new Date(new Date().getFullYear() - 100, 0, 1)).getFullYear();
  const toYear = (maxDate ?? new Date(new Date().getFullYear() + 20, 0, 1)).getFullYear();
  return Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);
}

function getAvailableMonths(
  year: number,
  minDate?: Date,
  maxDate?: Date,
): number[] {
  const months: number[] = [];
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    if (minDate && monthEnd.getTime() < startOfDay(minDate).getTime()) continue;
    if (maxDate && monthStart.getTime() > startOfDay(maxDate).getTime()) continue;
    months.push(month);
  }
  return months;
}

function MonthYearNav({
  displayMonth,
  onChange,
  minDate,
  maxDate,
}: {
  displayMonth: Date;
  onChange: (month: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const years = getYearRange(minDate, maxDate);
  const year = displayMonth.getFullYear();
  const availableMonths = getAvailableMonths(year, minDate, maxDate);
  const month = availableMonths.includes(displayMonth.getMonth())
    ? displayMonth.getMonth()
    : availableMonths[0] ?? 0;

  return (
    <div className="flex gap-2 px-1 pb-3 mb-1 border-b border-light-border dark:border-dark-border">
      <select
        aria-label="Select month"
        className={selectClassName}
        value={month}
        onChange={(e) => onChange(new Date(year, Number(e.target.value), 1))}
      >
        {availableMonths.map((m) => (
          <option key={m} value={m}>
            {MONTH_LABELS[m]}
          </option>
        ))}
      </select>
      <select
        aria-label="Select year"
        className={cn(selectClassName, 'max-w-[7rem]')}
        value={year}
        onChange={(e) => {
          const nextYear = Number(e.target.value);
          const nextMonths = getAvailableMonths(nextYear, minDate, maxDate);
          const nextMonth = nextMonths.includes(month)
            ? month
            : nextMonths[0] ?? 0;
          onChange(new Date(nextYear, nextMonth, 1));
        }}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

function CalendarPanel({
  selectedDate,
  minDate,
  maxDate,
  required,
  onSelect,
}: {
  selectedDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  onSelect: (date: Date) => void;
}) {
  const [displayMonth, setDisplayMonth] = useState(
    () => selectedDate ?? minDate ?? maxDate ?? new Date(),
  );

  useEffect(() => {
    setDisplayMonth(selectedDate ?? minDate ?? maxDate ?? new Date());
  }, [selectedDate, minDate, maxDate]);

  return (
    <>
      <MonthYearNav
        displayMonth={displayMonth}
        onChange={setDisplayMonth}
        minDate={minDate}
        maxDate={maxDate}
      />
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onSelect(date)}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        disabled={(date) => {
          const day = startOfDay(date);
          if (minDate && day.getTime() < minDate.getTime()) return true;
          if (maxDate && day.getTime() > maxDate.getTime()) return true;
          return false;
        }}
        required={required}
        showOutsideDays
        disableNavigation
        fromYear={(minDate ?? new Date(new Date().getFullYear() - 100, 0, 1)).getFullYear()}
        toYear={(maxDate ?? new Date(new Date().getFullYear() + 20, 0, 1)).getFullYear()}
        components={{
          Caption: () => <></>,
        }}
      />
    </>
  );
}

function parseValue(value: string | undefined): Date | undefined {
  if (!value || value.trim() === '') return undefined;
  
  // Try parsing with our expected format and start of day as reference
  const d = parse(value, VALUE_FORMAT, startOfDay(new Date()));
  if (isValid(d)) return d;
  
  // Fallback to native Date parsing if it's an ISO string or other format
  const native = new Date(value);
  if (isValid(native)) return startOfDay(native);
  
  return undefined;
}

function toValueFormat(date: Date): string {
  return format(startOfDay(date), VALUE_FORMAT);
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  required,
  disabled,
  placeholder = 'Select date',
  id: idProp,
  min,
  max,
  wrapperClassName,
  displayFormat = DISPLAY_FORMAT,
}: DatePickerProps) {
  const id = idProp ?? useId();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseValue(value);
  const minDate = min ? parseValue(min) : undefined;
  const maxDate = max ? parseValue(max) : undefined;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(toValueFormat(date));
    setOpen(false);
  };

  const displayText = selectedDate ? format(selectedDate, displayFormat) : '';

  return (
    <div ref={wrapperRef} className={cn('w-full relative', wrapperClassName)}>
      {label && (
        <label
          htmlFor={id}
          className="block font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}${displayText ? `, ${displayText}` : ''}` : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-left flex items-center gap-2',
          'text-light-text-primary dark:text-dark-text-primary',
          'border-light-border dark:border-dark-border',
          'focus:outline-none focus:border-dark-border focus:ring-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[40px]',
          '[background-color:var(--input-field-bg)]',
          error && 'border-red-500 dark:border-red-500',
          !displayText && 'text-light-text-muted dark:text-dark-text-muted'
        )}
      >
        <Calendar
          className="h-4 w-4 flex-shrink-0 text-light-text-muted dark:text-dark-text-muted"
          aria-hidden
        />
        <span
          className={cn('flex-1 truncate', !displayText && 'text-light-text-muted dark:text-dark-text-muted')}
          style={!displayText ? { fontSize: 'var(--text-placeholder)' } : undefined}
        >
          {displayText || placeholder}
        </span>
      </button>

      {open && typeof document !== 'undefined' && (
        <DropdownPortal triggerRef={wrapperRef} dropdownRef={dropdownRef}>
          <div
            className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-surface shadow-lg date-picker-dropdown pointer-events-auto"
            role="dialog"
            aria-label="Choose date"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CalendarPanel
              selectedDate={selectedDate}
              minDate={minDate}
              maxDate={maxDate}
              required={required}
              onSelect={handleSelect}
            />
          </div>
        </DropdownPortal>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

/**
 * Portal wrapper — positions calendar in viewport, flipping above trigger when needed.
 */
function DropdownPortal({
  children,
  triggerRef,
  dropdownRef,
}: {
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const dropdown = dropdownRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const dropdownHeight = dropdown?.offsetHeight ?? 360;
    const dropdownWidth = dropdown?.offsetWidth ?? 320;
    const gap = 4;
    const padding = 8;

    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const openAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    let top = openAbove ? rect.top - dropdownHeight - gap : rect.bottom + gap;
    let left = rect.left;

    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }
    left = Math.max(padding, left);

    top = Math.min(Math.max(padding, top), window.innerHeight - dropdownHeight - padding);

    setCoords({ top, left });
  }, [triggerRef, dropdownRef]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [mounted, updatePosition]);

  useEffect(() => {
    if (!mounted) return;

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [mounted, updatePosition]);

  useEffect(() => {
    if (!mounted || !dropdownRef.current) return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(dropdownRef.current);
    return () => observer.disconnect();
  }, [mounted, updatePosition]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 10001,
        pointerEvents: 'auto',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
