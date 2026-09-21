'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './Input';

interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  original?: any;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onSelect: (option: ComboboxOption | null) => void;
  onSearchChange?: (search: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
}

export function Combobox({
  options,
  value,
  onSelect,
  onSearchChange,
  placeholder = 'Search...',
  label,
  error,
  isLoading,
  className,
  disabled,
  required,
  allowCustom = true,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal search with externally selected value if option exists
  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    if (selectedOption) {
      setSearch(selectedOption.label);
    } else if (value) {
      // If there is a value but no matching option (maybe loading), don't clear search
    } else if (!value && !allowCustom) {
      // Only clear if not allowing custom values
      setSearch('');
    }
  }, [value, options, allowCustom]);

  // Filter options if onSearchChange is not provided (local filtering)
  const filteredOptions = useMemo(() => {
    if (onSearchChange) return options;
    if (!search) return options;
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase()) || 
      opt.subLabel?.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, onSearchChange]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onSearchChange?.(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    
    // If empty and not allowing custom, clear selection
    if (!val && !allowCustom) {
      onSelect(null);
    }
  };

  const handleSelect = (option: ComboboxOption | null) => {
    if (option) {
      setSearch(option.label);
      onSelect(option);
    } else if (allowCustom && search) {
      onSelect({ value: search, label: search });
    } else {
      setSearch('');
      onSelect(null);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const showCustom = search && allowCustom;
    const maxIndex = filteredOptions.length + (showCustom ? 1 : 0) - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          if (highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (showCustom) {
            handleSelect(null);
          }
        } else if (allowCustom && search) {
          handleSelect(null);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        if (isOpen && highlightedIndex >= 0) {
          if (highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (showCustom) {
            handleSelect(null);
          }
        }
        setIsOpen(false);
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-10 transition-all duration-200',
            // `primary` is not a colour in tailwind.config, so the open and
            // selected states used to render with no styling at all.
            isOpen && 'ring-2 ring-blue-500/20 border-blue-500',
            error && 'border-red-500 focus:ring-red-500'
          )}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-light-text-muted" />
          ) : (
            <ChevronDown className={cn("h-4 w-4 text-light-text-muted transition-transform duration-200", isOpen && "transform rotate-180")} />
          )}
        </div>
      </div>

      {isOpen && (search || filteredOptions.length > 0 || isLoading) && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
          {isLoading && filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-sm text-light-text-muted">
              Searching...
            </div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option, index) => {
                const isSelected = value === option.value;
                const isHighlighted = highlightedIndex === index;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors',
                      isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-light-text-primary dark:text-dark-text-primary',
                      isSelected && 'bg-blue-50/60 dark:bg-blue-900/10 font-semibold'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{option.label}</span>
                      {option.subLabel && (
                        <span className="text-[10px] opacity-70">{option.subLabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                );
              })}

              {search && allowCustom && (
                <div className={cn(
                  "p-1 border-t border-light-border dark:border-dark-border mt-1",
                  filteredOptions.length === 0 && "border-t-0 mt-0"
                )}>
                  <button
                    type="button"
                    onClick={() => handleSelect(null)}
                    onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 transition-colors",
                      highlightedIndex === filteredOptions.length
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-blue-600 dark:text-blue-400'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Use custom: "{search}"</span>
                  </button>
                </div>
              )}

              {!isLoading && filteredOptions.length === 0 && !search && (
                <div className="p-4 text-center text-sm text-light-text-muted">
                  Start typing to search...
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

