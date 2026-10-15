import { CustomerScope } from "@/components/customer/CustomerScope";
import { requireUser } from "@/actions/auth.actions";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <CustomerScope>{children}</CustomerScope>;
}
