"use client";
import { useActionState, useRef } from "react";
import type { ActionResult } from "@/lib/errors";

type Result = ActionResult<{ id: string }> | undefined;
type SaveAction = (
  state: Result,
  form: FormData,
) => Promise<ActionResult<{ id: string }>>;

export function useAdminFormAction(save: SaveAction, initialId?: string) {
  const savedId = useRef(initialId);
  return useActionState(async (previous: Result, form: FormData) => {
    // Keep editing the created record even if a later save fails validation.
    if (savedId.current) {
      form.set("id", savedId.current);
      form.set("operation", "edit");
    }
    const result = await save(previous, form);
    if (result.ok) savedId.current = result.data.id;
    return result;
  }, undefined);
}
