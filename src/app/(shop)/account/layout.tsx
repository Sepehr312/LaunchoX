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
  return (
    <main className={`store-shell ${styles.scope} ${styles.shell}`}>
      <aside className={styles.sidebar}>
        <span className={styles.icon}>
          <UserIcon />
        </span>
        <h1 className="mt-5 text-xl font-bold">حساب کاربری</h1>
        <p className="mt-2 text-sm break-words text-muted">
          {user.name}، خوش آمدید
        </p>
        <CustomerNavigation />
        <form
          action={logoutAction}
          className="mt-6 border-t border-border pt-5"
        >
          <Button
            variant="secondary"
            type="submit"
            className="w-full text-danger"
          >
            خروج از حساب
          </Button>
        </form>
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
