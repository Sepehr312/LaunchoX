import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ClipboardList,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  Snowflake,
  Truck,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { DashboardMenu } from "@/components/customer/DashboardMenu";
import { OrderBadge } from "@/components/customer/OrderBadge";
import { OrderProgress } from "@/components/customer/OrderProgress";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import type { UserDTO, OrderDTO } from "@/types/dto";
import type { OrderStatus } from "@/types/domain";
import styles from "@/components/customer/dashboard.module.css";

type DashboardOrders = {
  counts: Record<OrderStatus, number>;
  total: number;
  latest: OrderDTO | null;
};

export function CustomerDashboard({
  user,
  orders,
}: {
  user: UserDTO;
  orders: DashboardOrders;
}) {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join(" ");
  const address = user.addresses.find((entry) => entry.isDefault);
  const sidebar = (
    <>
      <div className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          {initials}
        </span>
        <strong>{user.name}</strong>
        <span>حساب مشتری</span>
      </div>
      <nav className={styles.navigation} aria-label="حساب مشتری">
        <Link href="/test/dashboard" aria-current="page">
          <LayoutGrid aria-hidden="true" />
          داشبورد
        </Link>
        <Link href="/account/orders">
          <ClipboardList aria-hidden="true" />
          سفارش‌های من
        </Link>
        <Link href="/account/addresses">
          <MapPin aria-hidden="true" />
          آدرس‌های من
        </Link>
        <Link href="/account">
          <ShieldCheck aria-hidden="true" />
          پروفایل و امنیت
        </Link>
      </nav>
      <form action={logoutAction} className={styles.logout}>
        <button type="submit">
          <LogOut size={20} aria-hidden="true" />
          خروج از حساب
        </button>
      </form>
    </>
  );
  const stats = [
    { label: "همهٔ سفارش‌ها", value: orders.total, Icon: ClipboardList },
    { label: "در حال پردازش", value: orders.counts.processing, Icon: Settings },
    { label: "ارسال‌شده", value: orders.counts.shipped, Icon: Truck },
    { label: "تحویل‌شده", value: orders.counts.delivered, Icon: Package },
  ];
  const latest = orders.latest;
  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/account">حساب کاربری</Link>
          <ChevronLeft size={14} aria-hidden="true" />
          <span aria-current="page">داشبورد</span>
        </nav>
        <div className={styles.mobileHeading}>
          <h1>داشبورد</h1>
          <DashboardMenu>{sidebar}</DashboardMenu>
        </div>
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="منوی حساب">
            {sidebar}
          </aside>
          <div className={styles.content}>
            <section
              className={styles.welcome}
              aria-labelledby="dashboard-welcome"
            >
              <div>
                <p className={styles.eyebrow}>فضای شخصی شما</p>
                <h2 id="dashboard-welcome">
                  {user.name.split(" ")[0]} عزیز، خوش آمدید
                </h2>
                <p>سفارش‌ها و اطلاعات حسابتان را اینجا مدیریت کنید.</p>
              </div>
              <Snowflake className={styles.welcomeSnow} aria-hidden="true" />
            </section>
            <section className={styles.stats} aria-label="خلاصهٔ سفارش‌ها">
              {stats.map(({ label, value, Icon }) => (
                <div className={styles.stat} key={label}>
                  <span className={styles.icon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{label}</h3>
                    <strong>{toPersianDigits(value)}</strong>
                  </div>
                </div>
              ))}
            </section>
            {(orders.counts.pending > 0 || orders.counts.cancelled > 0) && (
              <p className={styles.additional}>
                {orders.counts.pending > 0 && (
                  <span>
                    در انتظار پرداخت: {toPersianDigits(orders.counts.pending)}
                  </span>
                )}
                {orders.counts.cancelled > 0 && (
                  <span>
                    لغوشده: {toPersianDigits(orders.counts.cancelled)}
                  </span>
                )}
              </p>
            )}
            <section
              className={styles.panel}
              aria-labelledby="latest-order-title"
            >
              <div className={styles.panelHeading}>
                <h2 id="latest-order-title">آخرین سفارش</h2>
                <Link href="/account/orders" className={styles.textLink}>
                  همهٔ سفارش‌ها
                  <ChevronLeft size={16} aria-hidden="true" />
                </Link>
              </div>
              {latest ? (
                <>
                  <div className={styles.orderBox}>
                    <div className={styles.orderHeading}>
                      <div>
                        <h3>
                          سفارش <bdi>{toPersianDigits(latest.orderNumber)}</bdi>
                        </h3>
                        <p>{formatDate(latest.createdAt)}</p>
                      </div>
                      <OrderBadge status={latest.status} />
                    </div>
                    <ul className={styles.items}>
                      {latest.items.map((item, index) => (
                        <li key={`${item.product}-${index}`}>
                          <Image
                            unoptimized
                            src={item.image}
                            alt={item.title}
                            width={64}
                            height={88}
                          />
                          <div>
                            <strong>{item.title}</strong>
                            <p>تعداد: {toPersianDigits(item.quantity)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className={styles.total}>
                      <span>مبلغ نهایی سفارش</span>
                      <strong>{formatPrice(latest.total)}</strong>
                    </div>
                    <OrderProgress status={latest.status} />
                  </div>
                  <div className={styles.orderAction}>
                    <Link
                      href={`/account/orders/${latest.id}`}
                      className={styles.primary}
                    >
                      جزئیات و پیگیری
                      <ArrowLeft size={17} aria-hidden="true" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className={styles.empty}>
                  <Package size={36} aria-hidden="true" />
                  <h3>هنوز سفارشی ثبت نکرده‌اید</h3>
                  <p>پس از اولین خرید، وضعیت سفارش را اینجا ببینید.</p>
                  <Link className={styles.primary} href="/products">
                    مشاهدهٔ محصولات
                  </Link>
                </div>
              )}
            </section>
            <div className={styles.details}>
              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <h2>آدرس پیش‌فرض</h2>
                  <Link className={styles.textLink} href="/account/addresses">
                    مدیریت آدرس‌ها
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Link>
                </div>
                <div className={styles.detailBody}>
                  <span className={styles.icon}>
                    <MapPin aria-hidden="true" />
                  </span>
                  <div>
                    {address ? (
                      <>
                        <h3>{address.title}</h3>
                        <p>
                          {address.province}، {address.city}،{" "}
                          {toPersianDigits(address.addressLine)}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3>آدرس پیش‌فرض ندارید</h3>
                        <p>از مدیریت آدرس‌ها، آدرسی اضافه یا انتخاب کنید.</p>
                      </>
                    )}
                  </div>
                </div>
              </section>
              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <h2>اطلاعات حساب</h2>
                  <Link className={styles.textLink} href="/account">
                    ویرایش اطلاعات
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Link>
                </div>
                <div className={styles.detailBody}>
                  <span className={styles.icon}>
                    <UserRound aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{user.name}</h3>
                    <p>
                      <bdi>{user.email}</bdi>
                    </p>
                    {user.mobile && <p>{toPersianDigits(user.mobile)}</p>}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
