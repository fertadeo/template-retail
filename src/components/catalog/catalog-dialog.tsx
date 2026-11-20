"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};
export function CatalogDialog(props: Props) {
  return (
    <ModalPortal>
      <CatalogDialogContent {...props} />
    </ModalPortal>
  );
}
function CatalogDialogContent({
  title,
  subtitle,
  onClose,
  busy = false,
  wide = false,
  children,
  footer,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      className={`fixed inset-0 m-auto flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-black/5 bg-[#faf9f6] p-0 text-[#22352f] shadow-2xl backdrop:bg-[#142b24]/55 backdrop:backdrop-blur-sm ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e6e9e2] px-5 py-5 sm:px-7">
        <div>
          <h2 id={id} className="font-display text-xl font-semibold">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[#66736b]">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e9ede6] transition hover:bg-[#dbe3d7] disabled:opacity-40"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
        {children}
      </div>
      {footer ? (
        <footer className="shrink-0 border-t border-[#e6e9e2] bg-[#faf9f6] px-5 py-4 sm:px-7">
          {footer}
        </footer>
      ) : null}
    </dialog>
  );
}
