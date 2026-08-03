import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  /** Tailwind max-width class for the panel. */
  size?: 'md' | 'lg' | 'xl';
  /** Align to the top instead of centring (used by the command palette). */
  align?: 'center' | 'top';
  children: React.ReactNode;
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell.
 *
 * The four dialogs in this app each reimplemented the same overlay and each
 * shipped the same defects: no max-height (so a tall dialog was unreachable on
 * a short viewport), no backdrop dismissal, a 24px close button, and no focus
 * management — opening one left focus stranded on the trigger behind the
 * overlay, and Tab walked straight out of the dialog into the page underneath.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  align = 'center',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Move focus in on open, put it back where it came from on close.
  useEffect(() => {
    if (!isOpen) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    return () => restoreFocusTo.current?.focus?.();
  }, [isOpen]);

  // Escape to dismiss; Tab cycles within the dialog.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes?.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Stop the page behind the overlay from scrolling.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      // Backdrop click dismisses; the check keeps clicks inside the panel from
      // bubbling up and closing it.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center p-4 animate-in fade-in ${
        align === 'top' ? 'items-start pt-16 sm:pt-20' : 'items-center'
      }`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        // max-h + flex column so long content scrolls inside the panel
        // instead of overflowing off-screen on short viewports.
        className={`bg-slate-900 border border-slate-800 w-full ${SIZE[size]} rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[calc(100dvh-2rem)] focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4 sm:px-6 shrink-0">
          <h2 className="flex items-center gap-2 font-extrabold text-slate-100 text-base min-w-0">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex items-center justify-center min-w-11 min-h-11 shrink-0 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">{children}</div>
      </div>
    </div>
  );
};
