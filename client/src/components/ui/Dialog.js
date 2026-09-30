import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter((element) => element.getClientRects().length > 0);
}

/**
 * Accessible modal. `variant="modal"` is a centred dialog that becomes a bottom
 * sheet on phones; `variant="drawer"` slides in from the right.
 * Focus is trapped while open and returned to the trigger on close.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  variant = 'modal',
  size = 'md',
  role = 'dialog',
  initialFocusRef,
  bodyClassName,
  dismissible = true,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Lock page scroll, move focus in, and restore focus when the dialog closes.
  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current || getFocusable(panelRef.current)[0] || panelRef.current;
      target?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, initialFocusRef]);

  // Escape closes; Tab cycles inside the panel.
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (dismissible) {
          event.preventDefault();
          closeRef.current?.();
        }
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      const items = getFocusable(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dismissible]);

  if (!open) return null;

  const isDrawer = variant === 'drawer';
  const hasBody = children !== undefined && children !== null && children !== false;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-sign/55"
        onMouseDown={dismissible ? () => closeRef.current?.() : undefined}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex',
          isDrawer ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-6'
        )}
      >
        <div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex w-full flex-col bg-surface shadow-overlay focus:outline-none',
            isDrawer
              ? 'h-full animate-drawer-in sm:max-w-[30rem]'
              : cn('max-h-[92vh] animate-dialog-in rounded-t-dialog sm:rounded-dialog', SIZES[size] || SIZES.md)
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-start gap-4 px-5 pt-5 sm:px-6',
              hasBody ? 'border-b border-line pb-4' : 'pb-5'
            )}
          >
            {icon}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id={titleId} className="text-xl font-bold leading-snug">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-[15px] text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => closeRef.current?.()}
              disabled={!dismissible}
              aria-label="Close"
              className="-mr-2 -mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {hasBody ? (
            <div className={bodyClassName || 'min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6'}>{children}</div>
          ) : null}

          {footer ? (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface-muted px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
