import type { OrderStatus } from "@/types/domain";
import Link from "next/link";
import {
  ClipboardList,
  Settings,
  Truck,
  PackageCheck,
  ArrowLeft,
  MapPin,
  UserRound,
  ShieldCheck,
  Snowflake,
} from "lucide-react";
import { requireUser } from "@/actions/auth.actions";
import { getProfile, getCheckoutAddresses } from "@/services/user.service";
import { getCustomerOrderCounts } from "@/services/customer-dashboard.service";
import { listOrdersForUser } from "@/services/order.service";
import { customerDashboardQuerySchema } from "@/validations/customer-dashboard";
import { toPersianDigits } from "@/lib/format";
import { DashboardOrderCard } from "@/components/customer/DashboardOrderCard";
import { CustomerEmpty } from "@/components/customer/CustomerEmpty";
import { CustomerField } from "@/components/customer/CustomerField";
import { AccountForm } from "@/components/account/AccountForm";
import { AddressFields } from "@/components/account/AddressFields";
import { AddressEditor } from "@/components/account/AddressEditor";
import styles from "@/components/customer/dashboard.module.css";

const dashboardHref = "/account";

export async function CustomerDashboard({
  searchParams,
  view = "dashboard",
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  view?: "dashboard" | "orders" | "addresses" | "profile";
}) {
  const session = await requireUser();
  const parsed = customerDashboardQuerySchema.safeParse({
    ...(await searchParams),
    view,
  });
  if (!parsed.success)
    return (
      <CustomerEmpty
        title="پارامترهای صفحه معتبر نیست"
        description="برای ادامه به داشبورد برگردید."
        href={dashboardHref}
        label="بازگشت به داشبورد"
      />
    );
  const { page, status } = parsed.data;
  const [user, counts, addresses, orders] = await Promise.all([
    getProfile(session.id),
    getCustomerOrderCounts(session.id),
    getCheckoutAddresses(session.id),
    listOrdersForUser(session.id, {
      page: view === "orders" ? page : 1,
      limit: view === "orders" ? 3 : 1,
      status: view === "orders" ? status : undefined,
    }),
  ]);
  const address = addresses.find((item) => item.isDefault);
  const orderHref = (
    nextPage: number,
    nextStatus: OrderStatus | undefined = status,
  ) =>
    `/account/orders?page=${nextPage}${nextStatus ? `&status=${nextStatus}` : ""}`;
  return (
    <div className={styles.content}>
      {view === "dashboard" && (
        <>
          <section className={styles.welcome}>
            <Snowflake aria-hidden="true" />
            <h1>{user.name} عزیز، خوش آمدید</h1>
            <p>سفارش‌ها و اطلاعات حسابتان را اینجا مدیریت کنید.</p>
          </section>
          <div className={styles.stats}>
            {(
              [
                {
                  label: "همه سفارش‌ها",
                  count: counts.total,
                  Icon: ClipboardList,
                  status: undefined,
                },
                {
                  label: "در حال پردازش",
                  count: counts.processing,
                  Icon: Settings,
                  status: "processing",
                },
                {
                  label: "ارسال‌شده",
                  count: counts.shipped,
                  Icon: Truck,
                  status: "shipped",
                },
                {
                  label: "تحویل‌شده",
                  count: counts.delivered,
                  Icon: PackageCheck,
                  status: "delivered",
                },
              ] as const
            ).map(({ label, count, Icon, status }) => (
              <Link
                key={label}
                href={orderHref(1, status)}
                className={styles.stat}
              >
                <span className={styles.icon}>
                  <Icon />
                </span>
                <div>
                  <span>{label}</span>
                  <strong>{toPersianDigits(count)}</strong>
                </div>
              </Link>
            ))}
          </div>
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <h2>آخرین سفارش</h2>
              <Link href="/account/orders">
                همه سفارش‌ها <ArrowLeft size={16} />
              </Link>
            </div>
            {orders.items[0] ? (
              <DashboardOrderCard order={orders.items[0]} progress />
            ) : (
              <CustomerEmpty
                title="هنوز سفارشی ندارید"
                description="پس از اولین خرید، وضعیت سفارش شما اینجا نمایش داده می‌شود."
                href="/products"
                label="مشاهده محصولات"
              />
            )}
          </section>
          <div className={styles.twoColumns}>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <h2>آدرس پیش‌فرض</h2>
                <Link href="/account/addresses">
                  مدیریت آدرس‌ها <ArrowLeft size={15} />
                </Link>
              </div>
              <div className={styles.summary}>
                <span className={styles.icon}>
                  <MapPin />
                </span>
                <div>
                  <strong>{address?.title ?? "آدرس پیش‌فرض ثبت نشده"}</strong>
                  <p>
                    {address
                      ? `${address.province}، ${address.city}، ${toPersianDigits(address.addressLine)}`
                      : "آدرس ارسال سفارش خود را اضافه کنید."}
                  </p>
                </div>
              </div>
            </section>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <h2>اطلاعات حساب</h2>
                <Link href="/account/profile">
                  ویرایش اطلاعات <ArrowLeft size={15} />
                </Link>
              </div>
              <div className={styles.summary}>
                <span className={styles.icon}>
                  <UserRound />
                </span>
                <div>
                  <strong>{user.name}</strong>
                  <p dir="ltr">{user.email}</p>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
      {view === "orders" && (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div>
              <h1>سفارش‌های من</h1>
              <p>وضعیت و جزئیات خریدهای خود را دنبال کنید.</p>
            </div>
            <small>{toPersianDigits(counts.total)} سفارش</small>
          </div>
          <nav className={styles.tabs} aria-label="فیلتر وضعیت سفارش">
            {[
              { label: "همه", value: undefined, count: counts.total },
              {
                label: "در حال پردازش",
                value: "processing",
                count: counts.processing,
              },
              {
                label: "ارسال‌شده",
                value: "shipped",
                count: counts.shipped,
              },
              {
                label: "تحویل‌شده",
                value: "delivered",
                count: counts.delivered,
              },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={`/account/orders${tab.value ? `?status=${tab.value}` : ""}`}
                aria-current={status === tab.value ? "page" : undefined}
              >
                {tab.label} <span>{toPersianDigits(tab.count)}</span>
              </Link>
            ))}
          </nav>
          <div className={styles.orderList}>
            {orders.items.map((order) => (
              <DashboardOrderCard key={order.id} order={order} />
            ))}
            {!orders.items.length && (
              <CustomerEmpty
                title="سفارشی پیدا نشد"
                description="سفارشی با این وضعیت ثبت نشده است."
                href="/products"
                label="مشاهده محصولات"
              />
            )}
          </div>
          {orders.totalPages > 1 && (
            <nav className={styles.pagination} aria-label="صفحه‌بندی سفارش‌ها">
              {page > 1 && <Link href={orderHref(page - 1)}>قبلی</Link>}
              <span>
                صفحه {toPersianDigits(page)} از{" "}
                {toPersianDigits(orders.totalPages)}
              </span>
              {page < orders.totalPages && (
                <Link href={orderHref(page + 1)}>
                  بعدی <ArrowLeft size={14} />
                </Link>
              )}
            </nav>
          )}
        </section>
      )}
      {view === "addresses" && (
        <>
          <header className={styles.sectionHeading}>
            <div>
              <h1>آدرس‌های من</h1>
              <p>آدرس‌های ارسال سفارش را مدیریت کنید.</p>
            </div>
          </header>
          <div className={styles.twoColumns}>
            <section className={styles.panel}>
              <h2>آدرس‌های ثبت‌شده</h2>
              <div className={styles.orderList}>
                {addresses.map((item) => (
                  <article className={styles.address} key={item.id}>
                    <div className={styles.sectionHeading}>
                      <h3>
                        <MapPin size={18} />
                        {item.title}
                      </h3>
                      {item.isDefault && (
                        <span className={styles.defaultBadge}>پیش‌فرض ✓</span>
                      )}
                    </div>
                    <strong>{item.recipientName}</strong>
                    <p>
                      {item.province}، {item.city}،{" "}
                      {toPersianDigits(item.addressLine)}
                    </p>
                    <p>
                      موبایل: {toPersianDigits(item.mobile)}
                      <br />
                      کد پستی: {toPersianDigits(item.postalCode)}
                    </p>
                    <AddressEditor address={item} />
                    <div className={styles.addressActions}>
                      {!item.isDefault && (
                        <AccountForm
                          operation="default"
                          id={item.id}
                          label="انتخاب پیش‌فرض"
                        />
                      )}
                      <AccountForm
                        operation="delete"
                        id={item.id}
                        label="حذف آدرس"
                        confirm
                      />
                    </div>
                  </article>
                ))}
                {!addresses.length && (
                  <CustomerEmpty
                    title="هنوز آدرسی ثبت نکرده‌اید"
                    description="آدرس خود را از بخش افزودن آدرس جدید ثبت کنید."
                  />
                )}
              </div>
              <p className={styles.note}>
                می‌توانید حداکثر {toPersianDigits(5)} آدرس ذخیره کنید.
              </p>
            </section>
            <section className={styles.panel}>
              <h2>
                <MapPin size={21} />
                افزودن آدرس جدید
              </h2>
              <p className={styles.description}>
                اطلاعات گیرنده و نشانی را وارد کنید.
              </p>
              {addresses.length < 5 ? (
                <AccountForm operation="add" label="ذخیره آدرس">
                  <AddressFields />
                </AccountForm>
              ) : (
                <p>
                  ظرفیت آدرس‌ها تکمیل شده است؛ برای افزودن آدرس جدید، یکی از
                  آدرس‌ها را حذف کنید.
                </p>
              )}
            </section>
          </div>
        </>
      )}
      {view === "profile" && (
        <>
          <header className={styles.sectionHeading}>
            <div>
              <h1>پروفایل و امنیت</h1>
              <p>اطلاعات شخصی و رمز عبور خود را مدیریت کنید.</p>
            </div>
          </header>
          <div className={`${styles.twoColumns} ${styles.profilePanels}`}>
            <section className={styles.panel}>
              <h2>
                <UserRound size={22} />
                اطلاعات شخصی
              </h2>
              <p className={styles.description}>
                برای ارسال سفارش، اطلاعاتتان را به‌روز نگه دارید.
              </p>
              <div className={styles.email}>
                <span>
                  ایمیل حساب <small>غیرقابل ویرایش</small>
                </span>
                <bdi>{user.email}</bdi>
              </div>
              <AccountForm operation="profile" label="ذخیره اطلاعات">
                <CustomerField
                  name="name"
                  label="نام و نام خانوادگی"
                  defaultValue={user.name}
                  required
                  autoComplete="name"
                />
                <CustomerField
                  name="mobile"
                  label="شماره موبایل"
                  defaultValue={toPersianDigits(user.mobile ?? "")}
                  hint="اختیاری؛ شمارهٔ ۱۱ رقمی با شروع ۰۹"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </AccountForm>
              <p className={styles.note}>
                تغییرات پس از ذخیره در حساب شما اعمال می‌شود.
              </p>
            </section>
            <section className={styles.panel}>
              <h2>
                <ShieldCheck size={22} />
                تغییر رمز عبور
              </h2>
              <p className={styles.description}>
                برای تغییر رمز، ابتدا رمز فعلی خود را وارد کنید.
              </p>
              <AccountForm operation="password" label="ذخیره رمز جدید">
                {[
                  ["currentPassword", "رمز عبور فعلی"],
                  ["password", "رمز عبور جدید"],
                  ["confirmPassword", "تکرار رمز عبور جدید"],
                ].map(([name, label]) => (
                  <CustomerField
                    key={name}
                    name={name}
                    label={label}
                    type="password"
                    required
                    autoComplete={
                      name === "currentPassword"
                        ? "current-password"
                        : "new-password"
                    }
                  />
                ))}
              </AccountForm>
            </section>
          </div>
          <p className={styles.security}>
            <ShieldCheck size={19} />
            اطلاعات حساب شما محرمانه است.
          </p>
        </>
      )}
    </div>
  );
}
