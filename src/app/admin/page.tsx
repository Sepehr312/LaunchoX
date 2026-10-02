import type { Metadata } from "next";
import { requireAdmin, logoutAction } from "@/actions/auth.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "پنل مدیریت | لانچ‌اوکس" };
export default async function AdminPage() {
  await requireAdmin();
  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <Card>
        <h1 className="mb-4 text-xl font-bold">پنل مدیریت</h1>
        <form action={logoutAction}>
          <Button type="submit">خروج</Button>
        </form>
      </Card>
    </main>
  );
}
