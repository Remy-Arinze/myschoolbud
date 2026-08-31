'use client';

import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  hideHeader?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  className,
  contentClassName,
  hideHeader = false
}: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '4xl': 'max-w-7xl',
  };

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const isExitingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      isExitingRef.current = false;
      gsap.killTweensOf([backdropRef.current, panelRef.current].filter(Boolean));
      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      if (backdrop) gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      if (panel) gsap.fromTo(panel, { opacity: 0, scale: 0.95, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'all' });
    } else if (shouldRender && !isExitingRef.current) {
      isExitingRef.current = true;
      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      const complete = () => {
        setShouldRender(false);
        isExitingRef.current = false;
      };
      gsap.killTweensOf([backdrop, panel].filter(Boolean));
      const tl = gsap.timeline({ onComplete: complete });
      if (panel) tl.to(panel, { opacity: 0, scale: 0.95, y: 20, duration: 0.2, ease: 'power2.in' }, 0);
      if (backdrop) tl.to(backdrop, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
    }
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return createPortal(
    <Fragment>
      <div
        ref={backdropRef}
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[9999]"
        style={{ opacity: 0 }}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={typeof title === 'string' ? 'agora-modal-title' : undefined}
          className={cn(
            "bg-light-card dark:bg-dark-surface rounded-3xl shadow-2xl w-full",
            sizes[size],
            "max-h-[95vh] overflow-hidden flex flex-col pointer-events-auto",
            className
          )}
          style={{ opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {!hideHeader && (
            <div className="flex items-center justify-between p-6 border-b border-light-border dark:border-dark-border">
              <h2
                id={typeof title === 'string' ? 'agora-modal-title' : undefined}
                className="text-xl font-heading font-black text-light-text-primary dark:text-dark-text-primary"
              >
                {title}
              </h2>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-light-surface dark:hover:bg-dark-bg rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className={cn("flex-1 min-h-0 overflow-y-auto p-6 scrollbar-hide", contentClassName)}>
            {children}
          </div>
          {footer && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-light-border dark:border-dark-border bg-light-card dark:bg-dark-surface">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Fragment>,
    document.body
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  children?: ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  children,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';
  const toneClass =
    variant === 'warning'
      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      : variant === 'primary'
        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${toneClass}`}>
          <p className="text-sm font-medium leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
        {children}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl">
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm} isLoading={isLoading} className="rounded-xl px-6">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
