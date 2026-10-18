"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "@/components/customer/customer.module.css";

export function CustomerAccountShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (media.matches) dialog.current?.close();
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileOpen]);

  return (
    <main
      className={`store-shell ${styles.scope} ${styles.shell}`}
      data-sidebar-expanded={expanded}
    >
      <h1 className="sr-only">حساب کاربری</h1>
      <div className={styles.accountMobileControl}>
        <Button
          ref={trigger}
          variant="secondary"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls={`${id}-mobile`}
          onClick={() => {
            dialog.current?.showModal();
            setMobileOpen(true);
          }}
        >
          <Menu className="size-5" aria-hidden="true" />
          منوی حساب
        </Button>
      </div>
      <aside
        className={styles.sidebar}
        aria-label="ناوبری حساب مشتری"
        data-collapsed={!expanded}
      >
        <Button
          variant="secondary"
          className={styles.accountSidebarToggle}
          aria-expanded={expanded}
          aria-controls={`${id}-desktop`}
          aria-label={expanded ? "جمع کردن منوی حساب" : "باز کردن منوی حساب"}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <PanelRightClose className="size-5" aria-hidden="true" />
          ) : (
            <PanelRightOpen className="size-5" aria-hidden="true" />
          )}
          {expanded && <span>جمع کردن منو</span>}
        </Button>
        <div id={`${id}-desktop`} hidden={!expanded}>
          {sidebar}
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
      <dialog
        ref={dialog}
        id={`${id}-mobile`}
        className={styles.accountDrawer}
        aria-label="منوی حساب مشتری"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => {
          setMobileOpen(false);
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.x ||
            event.clientX > rect.x + rect.width ||
            event.clientY < rect.y ||
            event.clientY > rect.y + rect.height
          )
            dialog.current?.close();
        }}
      >
        <div className={styles.accountDrawerHeader}>
          <strong>منوی حساب</strong>
          <Button
            variant="secondary"
            autoFocus
            aria-label="بستن منوی حساب"
            className="size-11 p-0"
            onClick={() => dialog.current?.close()}
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div
          onClickCapture={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a[href]")
            )
              dialog.current?.close();
          }}
        >
          {sidebar}
        </div>
      </dialog>
    </main>
  );
}
