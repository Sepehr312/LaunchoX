"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageState } from "@/components/ui/PageState";
export type ErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
};
export function ErrorState({ reset }: ErrorStateProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }
  return (
    <PageState
      symbol="!"
      title="مشکلی در نمایش این صفحه پیش آمد"
      description="در حال حاضر امکان نمایش این صفحه وجود ندارد. کمی بعد دوباره تلاش کنید یا به صفحهٔ اصلی برگردید."
    >
      <Button onClick={retry} disabled={pending} aria-busy={pending}>
        {pending ? "در حال تلاش مجدد…" : "تلاش مجدد"}
      </Button>
    </PageState>
  );
}
