import type { Metadata } from "next";
import { requireUser, logoutAction } from "@/actions/auth.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "حساب کاربری | لانچ‌اوکس" };
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <Card>
        <h1 className="text-xl font-bold">حساب کاربری</h1>
        <p className="my-4">{user.name}</p>
        <form action={logoutAction}>
          <Button type="submit">خروج</Button>
        </form>
      </Card>
    </main>
  );
}
