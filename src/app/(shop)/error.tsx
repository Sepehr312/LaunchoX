"use client";
import { ErrorState, type ErrorStateProps } from "@/components/ui/ErrorState";
export default function ErrorPage(props: ErrorStateProps) {
  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorState {...props} />
    </main>
  );
}
