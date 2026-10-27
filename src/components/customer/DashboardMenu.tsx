"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import styles from "@/components/customer/dashboard.module.css";

export function DashboardMenu({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (media.matches) dialog.current?.close();
    };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  return (
    <div className={styles.mobileMenu}>
      <button
        ref={trigger}
        className={styles.secondary}
        aria-haspopup="dialog"
        aria-controls="dashboard-menu"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Menu size={20} aria-hidden="true" /> منوی حساب
      </button>
      <dialog
        ref={dialog}
        id="dashboard-menu"
        className={styles.drawer}
        aria-label="منوی حساب مشتری"
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.x ||
            event.clientX > rect.right ||
            event.clientY < rect.y ||
            event.clientY > rect.bottom
          )
            dialog.current?.close();
        }}
      >
        <div className={styles.drawerHeading}>
          <strong>منوی حساب</strong>
          <button
            autoFocus
            className={styles.iconButton}
            aria-label="بستن منوی حساب"
            onClick={() => dialog.current?.close()}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
