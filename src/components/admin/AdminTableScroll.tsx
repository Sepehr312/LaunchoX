"use client";

import { useRef, type ReactNode } from "react";

export function AdminTableScroll({
  children,
  label = "جدول اطلاعات",
}: {
  children: ReactNode;
  label?: string;
}) {
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(
    null,
  );
  return (
    <div
      className="admin-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(event) => {
        if (
          event.pointerType !== "mouse" ||
          event.button !== 0 ||
          (event.target as HTMLElement).closest(
            "a, button, input, select, textarea",
          )
        )
          return;
        drag.current = {
          x: event.clientX,
          scroll: event.currentTarget.scrollLeft,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current) return;
        const delta = event.clientX - current.x;
        if (!current.moved && Math.abs(delta) < 8) return;
        current.moved = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.currentTarget.scrollLeft = current.scroll - delta;
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onPointerLeave={() => {
        if (!drag.current?.moved) drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
