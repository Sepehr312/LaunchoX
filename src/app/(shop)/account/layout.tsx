import { requireUser } from "@/actions/auth.actions";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
