"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountForm } from "@/components/account/AccountForm";
import { AddressFields } from "@/components/account/AddressFields";
import type { AddressDTO } from "@/types/dto";
export function AddressEditor({ address }: { address: AddressDTO }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [saved, setSaved] = useState(false);
  const onSuccess = useCallback(() => {
    if (details.current) {
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }
    setSaved(true);
  }, []);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);
  return (
    <div className="mt-3 border-t border-border pt-2">
      <details ref={details}>
        <summary className="text-sm font-semibold text-primary">
          ویرایش آدرس
        </summary>
        <div className="mt-5">
          <AccountForm operation="edit" id={address.id} onSuccess={onSuccess}>
            <AddressFields key={JSON.stringify(address)} address={address} />
          </AccountForm>
        </div>
      </details>
      {saved && (
        <p role="status" className="mt-2 text-xs text-success">
          آدرس با موفقیت به‌روز شد.
        </p>
      )}
    </div>
  );
}
