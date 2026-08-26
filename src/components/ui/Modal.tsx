import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
}

export function Modal({ children, description, onClose, title }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focusableElements() {
      if (!dialogRef.current) return [];
      return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    }

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const autoFocusTarget = dialogRef.current?.querySelector<HTMLElement>("[autofocus]");
      const firstField = dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      const firstAction = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled])');
      const preferred = autoFocusTarget ?? firstField ?? firstAction;
      (preferred ?? dialogRef.current)?.focus();
    });
    document.addEventListener("keydown", handleKeyboard, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyboard, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="modal-layer modal-overlay open" role="presentation">
      <button aria-label="Close dialog" className="modal-backdrop" onClick={onClose} type="button" />
      <section aria-describedby={description ? descriptionId : undefined} aria-labelledby={titleId} aria-modal="true" className="modal-card modal" ref={dialogRef} role="dialog" tabIndex={-1}>
        <div aria-hidden="true" className="modal-handle" />
        <header className="modal-card__header">
          <div>
            <h2 className="modal-title" id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button aria-label="Close" className="modal-close" onClick={onClose} type="button"><Icon name="close" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
