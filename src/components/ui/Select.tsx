'use client';

import { forwardRef, ReactNode, Children, isValidElement, useId } from 'react';
import * as RSelect from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  inline?: boolean;
  labelClassName?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  hideChevron?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: ReactNode;
}

export type ParsedSelectItem = { type: 'option'; value: string; label: string; disabled?: boolean };
export type ParsedSelectGroup = { type: 'optgroup'; label: string; items: ParsedSelectItem[] };
export type ParsedSelectNode = ParsedSelectItem | ParsedSelectGroup;

function reactChildToLabel(children: ReactNode): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return Children.toArray(children).map(reactChildToLabel).join('');
  }
  return String(children);
}

function toItems(children?: ReactNode): ParsedSelectNode[] {
  const results: ParsedSelectNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || typeof child.type !== 'string') return;

    if (child.type === 'option') {
      const props: any = child.props || {};
      const value = props.value != null ? String(props.value) : '';
      const label = props.children != null ? reactChildToLabel(props.children) : '';
      const disabled = !!props.disabled;
      if (value) results.push({ type: 'option', value, label, disabled });
    } else if (child.type === 'optgroup') {
      const props: any = child.props || {};
      const groupLabel = props.label || '';
      const items: ParsedSelectItem[] = [];

      Children.forEach(props.children, (subChild) => {
        if (isValidElement(subChild) && typeof subChild.type === 'string' && subChild.type === 'option') {
          const subProps: any = subChild.props || {};
          const value = subProps.value != null ? String(subProps.value) : '';
          const label = subProps.children != null ? reactChildToLabel(subProps.children) : '';
          const disabled = !!subProps.disabled;
          if (value) items.push({ type: 'option', value, label, disabled });
        }
      });

      if (items.length > 0) {
        results.push({ type: 'optgroup', label: groupLabel, items });
      }
    }
  });
  return results;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({
    className,
    label,
    error,
    helperText,
    id,
    children,
    wrapperClassName,
    inline = false,
    labelClassName,
    required,
    leftIcon,
    rightIcon,
    hideChevron = false,
    name,
    value,
    onChange,
    placeholder = 'Select...',
    disabled,
  }, ref) => {
    const selectId = id || useId();
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !hideChevron && (rightIcon !== undefined ? !!rightIcon : true);
    const showRightIcon = hasRightIcon && (rightIcon || <ChevronDown className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />);
    const items = toItems(children);
    const currentValue = typeof value === 'string' ? value : value != null ? String(value) : undefined;

    return (
      <div className={cn(inline ? '' : 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block font-medium text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-1',
              labelClassName
            )}
            style={{ fontSize: 'var(--text-body)' }}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <RSelect.Root value={currentValue} onValueChange={(val) => onChange?.({ target: { value: val } } as any)} disabled={disabled}>
          <div className="relative">
            {hasLeftIcon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                {leftIcon}
              </div>
            )}
            <RSelect.Trigger
              ref={ref}
              id={selectId}
              className={cn(
                'w-full py-2.5 border rounded-lg',
                hasLeftIcon ? 'pl-10' : 'px-4',
                hasRightIcon ? 'pr-10' : '',
                'bg-[var(--light-input)] dark:bg-[var(--dark-input)]',
                'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]',
                'focus:outline-none transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:border-[var(--light-border)] dark:hover:border-[var(--dark-border)]',
                'cursor-pointer',
                error
                  ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                  : 'border-[var(--light-border)] dark:border-[var(--dark-border)]',
                className
              )}
              aria-label={label}
              style={{ fontSize: 'var(--text-body)' }}
            >
              <RSelect.Value placeholder={placeholder} />
              {hasRightIcon && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                  {showRightIcon}
                </div>
              )}
            </RSelect.Trigger>
            <RSelect.Portal>
              <RSelect.Content
                position="popper"
                className={cn(
                  'z-50 mt-1 p-1 rounded-lg border',
                  'border-light-border dark:border-dark-border',
                  'bg-light-card dark:bg-dark-surface shadow-lg'
                )}
              >
                <RSelect.Viewport className="max-h-64 min-w-[var(--radix-select-trigger-width)]">
                  {items.map((node, i) => {
                    if (node.type === 'optgroup') {
                      return (
                        <RSelect.Group key={`group-${i}`}>
                          <RSelect.Label
                            className="px-2.5 py-1.5 text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider"
                          >
                            {node.label}
                          </RSelect.Label>
                          {node.items.map((opt) => (
                            <RSelect.Item
                              key={opt.value}
                              value={opt.value}
                              disabled={opt.disabled}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer ml-2',
                                'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] font-medium',
                                'focus:outline-none',
                                'hover:bg-light-card dark:hover:bg-dark-surface',
                                'data-[highlighted]:bg-light-card data-[highlighted]:dark:bg-dark-surface',
                                'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'
                              )}
                              style={{ fontSize: 'var(--text-body)' }}
                            >
                              <RSelect.ItemText>{opt.label}</RSelect.ItemText>
                              <RSelect.ItemIndicator>
                                <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
                              </RSelect.ItemIndicator>
                            </RSelect.Item>
                          ))}
                        </RSelect.Group>
                      );
                    }

                    return (
                      <RSelect.Item
                        key={node.value}
                        value={node.value}
                        disabled={node.disabled}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer',
                          'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]',
                          'focus:outline-none',
                          'hover:bg-light-card dark:hover:bg-dark-surface',
                          'data-[highlighted]:bg-light-card data-[highlighted]:dark:bg-dark-surface',
                          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'
                        )}
                        style={{ fontSize: 'var(--text-body)' }}
                      >
                        <RSelect.ItemText>{node.label}</RSelect.ItemText>
                        <RSelect.ItemIndicator>
                          <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
                        </RSelect.ItemIndicator>
                      </RSelect.Item>
                    );
                  })}
                </RSelect.Viewport>
              </RSelect.Content>
            </RSelect.Portal>
          </div>
        </RSelect.Root>
        {name && <input type="hidden" name={name} value={currentValue ?? ''} />}
        {error && (
          <p className="mt-1 text-red-600 dark:text-red-400" style={{ fontSize: 'var(--text-small)' }}>{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]" style={{ fontSize: 'var(--text-small)' }}>{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
