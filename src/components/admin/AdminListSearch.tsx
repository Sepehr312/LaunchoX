"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminListSearch({
  label,
  placeholder,
  query,
}: {
  label: string;
  placeholder: string;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftQuery, setDraftQuery] = useState(query);
  const [pending, startTransition] = useTransition();
  const ownNavigations = useRef(new Set<string>());

  useEffect(() => {
    // A completed search must not overwrite text typed while its response was loading.
    if (ownNavigations.current.delete(query)) return;
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    const nextQuery = draftQuery.trim();
    const currentQuery = searchParams.get("q") ?? "";
    if (nextQuery === currentQuery && !searchParams.has("status")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (nextQuery) params.set("q", nextQuery);
      else params.delete("q");
      params.delete("status");
      params.delete("page");
      ownNavigations.current.add(nextQuery);
      startTransition(() =>
        router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
          scroll: false,
        }),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [draftQuery, pathname, router, searchParams]);

  return (
    <div
      className="admin-list-search"
      role="search"
      aria-label="جستجو در فهرست"
    >
      <div className="admin-list-search-controls">
        <label className="admin-list-query">
          <span>{label}</span>
          <span className="admin-search-input">
            <Search size={20} aria-hidden="true" />
            <input
              name="q"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder={placeholder}
              maxLength={100}
            />
          </span>
        </label>
      </div>
      <p className="admin-live-search-status" role="status" aria-live="polite">
        {pending ? "در حال به‌روزرسانی نتایج…" : ""}
      </p>
    </div>
  );
}
