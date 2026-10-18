import { CustomerAccountShell } from "@/components/customer/CustomerAccountShell";
import { getProfile } from "@/services/user.service";
import { requireUser, logoutAction } from "@/actions/auth.actions";
import { CustomerNavigation } from "@/components/customer/CustomerNavigation";
import { Button } from "@/components/ui/Button";
import { UserIcon } from "@/components/store/Icons";
import styles from "@/components/customer/customer.module.css";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const user = await getProfile(session.id);
  const sidebar = (
    <>
      <span className={styles.icon}>
        <UserIcon />
      </span>
      <h2 className="mt-5 text-xl font-bold">حساب کاربری</h2>
      <p className="mt-2 text-sm break-words text-muted">
        {user.name}، خوش آمدید
      </p>
      <CustomerNavigation />
      <form action={logoutAction} className="mt-6 border-t border-border pt-5">
        <Button
          variant="secondary"
          type="submit"
          className="w-full text-danger"
        >
          خروج از حساب
        </Button>
      </form>
    </>
  );
  return (
    <CustomerAccountShell sidebar={sidebar}>{children}</CustomerAccountShell>
  );
}
