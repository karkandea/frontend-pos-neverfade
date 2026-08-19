import { useEffect, useRef, type RefObject } from "react";

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  onEscape?: () => void
) {
  const escapeHandler = useRef(onEscape);
  useEffect(() => {
    escapeHandler.current = onEscape;
  }, [onEscape]);
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first = dialog.querySelector<HTMLElement>(focusable);
    (first ?? dialog).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && escapeHandler.current) {
        event.preventDefault();
        escapeHandler.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialog.querySelectorAll<HTMLElement>(focusable));
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [dialogRef, open]);
}
