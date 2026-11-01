import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth.actions";
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/account");
  return children;
}
