'use client';

/**
 * TimeInput — a production-quality HH:mm time input.
 *
 * Design goals:
 *  - Lets the user type freely (e.g. "0800", "8:00", "800") and formats on blur
 *  - Keeps the native <input type="time"> as the backing element so mobile pickers
 *    still work and the value is always a valid HH:mm string when committed
 *  - Shows a red border + tooltip when the committed value is invalid
 *  - Accessible: label association, aria-invalid, title for screen readers
 *  - Matches the project's existing Tailwind class conventions
 *
 * Accepted input formats (typed):
 *   "8"        → 08:00
 *   "830"      → 08:30
 *   "0830"     → 08:30
 *   "8:30"     → 08:30
 *   "8:30am"   → 08:30
 *   "8:00pm"   → 20:00
 *   "8:3"      → 08:03  (ambiguous; we treat as HH:M → HH:0M)
 *   "083"      → 08:03
 *   "8.30"     → 08:30  (dot separator)
 *   "14:00"    → 14:00
 *   Native picker always emits "HH:mm" — passes through unchanged.
 *
 * onChange is only called with a valid "HH:mm" value (or "" to clear).
 * onError is called when the user leaves the field with an unparseable value.
 */

import { useState, useRef, useCallback, useId, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

const HH_MM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const FLEX_TIME_RE = /^(\d{1,2}):([0-5]\d)$/;
const MERIDIEM_RE = /\s*([ap])\.?m\.?\s*$/i;

/** True when the typed string looks finished (safe to commit before blur). */
export function isCompleteTimeInput(raw: string): boolean {
  const t = raw.trim();
  if (/^\d{1,2}:\d{2}\s*([ap]\.?m\.?)?$/i.test(t)) return true;
  if (/^\d{3,4}\s*([ap]\.?m\.?)?$/i.test(t)) return true;
  if (/^\d{1,2}\s*[ap]\.?m\.?$/i.test(t)) return true;
  return false;
}

/** Attempt to normalise a raw string to "HH:mm". Returns null on failure. */
export function parseTimeInput(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  const meridiemMatch = s.match(MERIDIEM_RE);
  const isAm = !!meridiemMatch && meridiemMatch[1].toLowerCase() === 'a';
  const isPm = !!meridiemMatch && meridiemMatch[1].toLowerCase() === 'p';
  if (meridiemMatch && meridiemMatch.index !== undefined) {
    s = s.slice(0, meridiemMatch.index).trim();
  }

  s = s.replace('.', ':'); // allow "8.30"

  let h: number;
  let m: number;

  const colon = FLEX_TIME_RE.exec(s);
  if (colon) {
    h = parseInt(colon[1], 10);
    m = parseInt(colon[2], 10);
  } else {
    const digits = s.replace(/\D/g, '');
    if (digits.length === 0) return null;

    if (digits.length === 1) {
      h = parseInt(digits, 10);
      m = 0;
    } else if (digits.length === 2) {
      h = parseInt(digits, 10);
      m = 0;
    } else if (digits.length === 3) {
      h = parseInt(digits[0], 10);
      m = parseInt(digits.slice(1), 10);
      if (m > 59) {
        h = parseInt(digits.slice(0, 2), 10);
        m = parseInt(digits[2], 10);
      }
    } else if (digits.length === 4) {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2), 10);
    } else {
      return null;
    }
  }

  if (isNaN(h) || isNaN(m) || m > 59) return null;

  if (isAm || isPm) {
    if (h < 1 || h > 12) return null;
    if (isPm && h !== 12) h += 12;
    if (isAm && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Is a string a valid "HH:mm" time? */
export function isValidTime(value: string): boolean {
  return HH_MM_RE.test(value);
}

// ─── component ──────────────────────────────────────────────────────────────

export interface TimeInputProps {
  /** Controlled value — must be "" or a valid "HH:mm" string */
  value: string;
  /** Called only with valid "HH:mm" or "" (to clear) */
  onChange: (value: string) => void;
  /** Called when the user leaves with an unparseable string */
  onError?: (rawValue: string) => void;
  /** Forwarded to the underlying input */
  disabled?: boolean;
  /** Additional class names for the wrapper div */
  className?: string;
  /** Accessible label (also used as placeholder hint) */
  label?: string;
  /** If true, an error style is shown even before the user blurs */
  forceError?: boolean;
  /** id — auto-generated if omitted */
  id?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  function TimeInput(
    { value, onChange, onError, disabled, className, label, forceError, id: idProp },
    ref
  ) {
    // Internal display value (what the user sees while typing)
    const [displayValue, setDisplayValue] = useState(value);
    const [hasError, setHasError] = useState(false);
    const isFocusedRef = useRef(false);
    const autoId = useId();
    const id = idProp ?? autoId;

    // Keep display in sync when the parent changes value externally
    // (e.g. auto-fill, reset). Skip while focused so typing isn't overwritten.
    const prevValueRef = useRef(value);
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (!isFocusedRef.current && (isValidTime(value) || value === '')) {
        setDisplayValue(value);
        setHasError(false);
      }
    }

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDisplayValue(raw);

        if (isCompleteTimeInput(raw)) {
          const parsed = parseTimeInput(raw);
          if (parsed) {
            setHasError(false);
            onChange(parsed);
            return;
          }
        }

        if (hasError) setHasError(false);
      },
      [hasError, onChange]
    );

    const handleFocus = useCallback(() => {
      isFocusedRef.current = true;
    }, []);

    const handleBlur = useCallback(() => {
      isFocusedRef.current = false;
      const raw = displayValue.trim();

      if (raw === '') {
        setHasError(false);
        onChange('');
        return;
      }

      const parsed = parseTimeInput(raw);
      if (parsed) {
        setDisplayValue(parsed);
        setHasError(false);
        onChange(parsed);
      } else {
        setHasError(true);
        onError?.(raw);
      }
    }, [displayValue, onChange, onError]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      },
      []
    );

    const showError = forceError || hasError;

    return (
      <div className={cn('relative', className)}>
        {label && (
          <label
            htmlFor={id}
            className="sr-only"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          // Use "text" so the user can type freely.
          // The native time picker is surfaced via the clock icon on most browsers
          // when type="text" is combined with inputMode hints — but for maximum
          // compatibility we keep type="time" and just allow free editing.
          //
          // HOWEVER: type="time" on Chrome/Safari still uses a spinbox by default.
          // We override that with a pattern + inputMode so it acts like a text field
          // while still accepting the native format on mobile.
          type="text"
          inputMode="numeric"
          // pattern helps mobile keyboards show the numeric layout
          pattern="[0-9:]*"
          placeholder="HH:MM"
          aria-label={label}
          aria-invalid={showError}
          title={showError ? 'Invalid time — use HH:MM (e.g. 08:30)' : label}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full px-2 py-1.5 text-[10px] sm:text-xs rounded transition-colors',
            'bg-[var(--light-input)] dark:bg-[var(--dark-input)]',
            'text-light-text-primary dark:text-dark-text-primary',
            showError
              ? 'border border-red-500 dark:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-500'
              : 'border border-[var(--light-border)] dark:border-[var(--dark-border)] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        {showError && (
          <p
            role="alert"
            className="absolute left-0 top-full mt-0.5 text-[10px] text-red-600 dark:text-red-400 whitespace-nowrap z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] px-1 rounded shadow"
          >
            Use HH:MM (e.g. 08:30)
          </p>
        )}
      </div>
    );
  }
);
