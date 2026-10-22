import type { ComponentProps } from "react";

export function FrosticIcon({
  name,
  ...props
}: ComponentProps<"svg"> & {
  name: "sun" | "moon" | "close" | "arrow";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
      {name === "moon" && (
        <path d="M20.8 13.2A9 9 0 0 1 10.8 3.1a9 9 0 1 0 10 10.1Z" />
      )}
      {name === "close" && <path d="m6 6 12 12M6 18 18 6" />}
      {name === "arrow" && <path d="M20 12H4m6-6-6 6 6 6" />}
    </svg>
  );
}
