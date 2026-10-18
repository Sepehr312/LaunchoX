import { getEnv } from "@/lib/env";
import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Check,
  Clock3,
  CreditCard,
  Package,
  UserRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  getOrderAdmin,
  getOrderCustomersAdmin,
} from "@/services/order.service";
import { objectIdSchema } from "@/validations/common";
import { adminOrderQuerySchema } from "@/validations/order";
import { AppError } from "@/lib/errors";
import { formatDateTime, formatPrice, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { CopyValue } from "@/components/admin/CopyValue";
import styles from "@/components/admin/OrderDetail.module.css";

export const dynamic = "force-dynamic";
const loadOrder = cache(async (id: string) => {
  await requireAdmin();
  const parsed = objectIdSchema.safeParse(id);
  if (!parsed.success) notFound();
  return getOrderAdmin(parsed.data).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await requireAdmin();
  const order = await loadOrder((await params).id);
  return {
    title: `مدیریت سفارش ${toPersianDigits(order.orderNumber)} | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
  };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const order = await loadOrder((await params).id);
  const listQuery = adminOrderQuerySchema.safeParse(await searchParams);
  const returnParams = new URLSearchParams();
  if (listQuery.success) {
    for (const [key, value] of Object.entries(listQuery.data)) {
      if (
        value !== undefined &&
        value !== "" &&
        !(key === "page" && value === 1) &&
        !(key === "limit" && value === 12)
      ) {
        returnParams.set(key, String(value));
      }
    }
  }
  const returnHref = `/admin/orders${returnParams.size ? `?${returnParams}` : ""}`;
  const people = new Map(
    (
      await getOrderCustomersAdmin([
        order.user,
        ...order.statusHistory.flatMap((entry) =>
          entry.changedBy ? [entry.changedBy] : [],
        ),
      ])
    ).map((person) => [person.id, person]),
  );
  const customer = people.get(order.user);
  const address = order.shippingAddress;
  const fullAddress = `${address.province}، ${address.city}، ${address.addressLine}`;
  const progress = ["pending", "processing", "shipped", "delivered"] as const;
  const step = progress.findIndex((status) => status === order.status);
  const history = [...order.statusHistory].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );
  const cancelledAt = history.find(
    (entry) => entry.status === "cancelled",
  )?.changedAt;
  const events = history.map((entry) => ({
    label: orderLabels[entry.status],
    changedAt: entry.changedAt,
    actor: entry.changedBy
      ? (people.get(entry.changedBy)?.name ?? "کاربر حذف‌شده")
      : "سیستم",
  }));
  if (order.payment.paidAt) {
    events.push({
      label: "پرداخت تأیید شد",
      changedAt: order.payment.paidAt,
      actor: "سیستم",
    });
  }
  events.sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );
  const paymentClass =
    order.payment.status === "paid"
      ? "admin-badge-success"
      : order.payment.status === "failed"
        ? "admin-badge-danger"
        : order.payment.status === "unpaid"
          ? "admin-badge-warning"
          : undefined;
  return (
    <div className={styles.page}>
      <header className={cn("admin-panel", styles.header)}>
        <div>
          <p className="admin-eyebrow">پنل مدیریت / سفارش‌ها / جزئیات سفارش</p>
          <h1 className={styles.title}>
            سفارش <bdi>{toPersianDigits(order.orderNumber)}</bdi>
            <CopyValue value={order.orderNumber} label="شماره سفارش" />
          </h1>
          <p className={styles.hint}>
            ثبت در{" "}
            <time dateTime={order.createdAt}>
              {formatDateTime(order.createdAt)}
            </time>
          </p>
          <div className={styles.badges}>
            <span
              className={cn(
                "admin-badge",
                order.status === "cancelled" && "admin-badge-danger",
                order.status === "delivered" && "admin-badge-success",
              )}
            >
              {orderLabels[order.status]}
            </span>
            <span className={cn("admin-badge", paymentClass)}>
              {paymentLabels[order.payment.status]}
            </span>
          </div>
        </div>
        <Link href={returnHref} className={styles.back}>
          <ArrowRight size={18} aria-hidden="true" />
          بازگشت به سفارش‌ها
        </Link>
      </header>
      <section
        className={cn("admin-panel", styles.progressPanel)}
        aria-label="مراحل سفارش"
      >
        {order.status === "cancelled" ? (
          <p className={styles.cancelled}>
            <Ban size={22} aria-hidden="true" />
            این سفارش لغو شده است.
            {cancelledAt && (
              <time dateTime={cancelledAt}>{formatDateTime(cancelledAt)}</time>
            )}
          </p>
        ) : (
          <ol className={styles.progress}>
            {progress.map((status, index) => (
              <li
                key={status}
                className={cn(
                  index < step && styles.completed,
                  index === step && styles.current,
                )}
                aria-current={index === step ? "step" : undefined}
              >
                <span className={styles.dot}>
                  {index < step ? (
                    <Check size={16} aria-hidden="true" />
                  ) : index === step ? (
                    <span />
                  ) : null}
                </span>
                <span>
                  {["ثبت سفارش", "آماده‌سازی", "ارسال", "تحویل"][index]}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className={styles.columns}>
        <div className={styles.main}>
          <section
            className={cn("admin-panel", styles.items)}
            aria-labelledby="order-items-heading"
          >
            <h2 id="order-items-heading">
              <Package size={22} aria-hidden="true" />
              اقلام سفارش
            </h2>
            {order.items.length ? (
              <div className={styles.itemList}>
                <div className={styles.itemHead} aria-hidden="true">
                  <span>محصول</span>
                  <span>تعداد</span>
                  <span>قیمت واحد</span>
                </div>
                {order.items.map((item, index) => (
                  <article
                    key={`${item.product}-${index}`}
                    className={styles.item}
                  >
                    <div className={styles.product}>
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          width={64}
                          height={80}
                          className={styles.productImage}
                        />
                      ) : (
                        <Package size={32} aria-hidden="true" />
                      )}
                      <h3>{item.title}</h3>
                    </div>
                    <p>
                      <span className={styles.mobileLabel}>تعداد: </span>
                      {toPersianDigits(item.quantity)}
                    </p>
                    <p>
                      <span className={styles.mobileLabel}>قیمت واحد: </span>
                      {formatPrice(item.price)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty">اقلامی برای این سفارش ثبت نشده است.</p>
            )}
            <dl className={styles.totals}>
              {[
                { label: "جمع اقلام", value: order.subtotal },
                { label: "هزینه ارسال", value: order.shippingFee },
                { label: "مبلغ کل", value: order.total },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{formatPrice(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section
            className={cn("admin-panel", styles.history)}
            aria-labelledby="order-history-heading"
          >
            <h2 id="order-history-heading">
              <Clock3 size={22} aria-hidden="true" />
              تاریخچه سفارش
            </h2>
            {events.length ? (
              <ol className={styles.timeline}>
                {events.map((entry, index) => (
                  <li key={`${entry.changedAt}-${index}`}>
                    <strong>{entry.label}</strong>
                    <p>
                      <time dateTime={entry.changedAt}>
                        {formatDateTime(entry.changedAt)}
                      </time>
                      <span> · {entry.actor}</span>
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="admin-empty">
                تاریخچه‌ای برای این سفارش ثبت نشده است.
              </p>
            )}
          </section>
        </div>
        <aside className={styles.side} aria-label="اقدامات و اطلاعات سفارش">
          <OrderStatusForm
            id={order.id}
            status={order.status}
            payment={order.payment.status}
          />
          <section
            className={cn("admin-panel", styles.customer)}
            aria-labelledby="order-customer-heading"
          >
            <h2 id="order-customer-heading">
              <UserRound size={22} aria-hidden="true" />
              مشتری و نشانی ارسال
            </h2>
            <p className={styles.customerName}>
              {customer?.name ?? "مشتری حذف‌شده"}
            </p>
            {customer && (
              <p className={styles.contact}>
                <bdi>{customer.email}</bdi>
                <CopyValue value={customer.email} label="ایمیل مشتری" />
              </p>
            )}
            <div className={styles.address}>
              <p>گیرنده: {address.recipientName}</p>
              <p className={styles.contact}>
                <a href={`tel:${address.mobile}`}>
                  <bdi>{toPersianDigits(address.mobile)}</bdi>
                </a>
                <CopyValue value={address.mobile} label="شماره تماس گیرنده" />
              </p>
              <p className={styles.contact}>
                <span>{toPersianDigits(fullAddress)}</span>
                <CopyValue value={fullAddress} label="نشانی ارسال" />
              </p>
              <p className={styles.contact}>
                <span>
                  کد پستی: <bdi>{toPersianDigits(address.postalCode)}</bdi>
                </span>
                <CopyValue value={address.postalCode} label="کد پستی" />
              </p>
            </div>
            {order.note && (
              <div className={styles.note}>
                <strong>یادداشت مشتری:</strong>
                <p>{order.note}</p>
              </div>
            )}
          </section>
          <section
            className={cn("admin-panel", styles.payment)}
            aria-labelledby="order-payment-heading"
          >
            <h2 id="order-payment-heading">
              <CreditCard size={22} aria-hidden="true" />
              اطلاعات پرداخت
            </h2>
            <span className={cn("admin-badge", paymentClass)}>
              {paymentLabels[order.payment.status]}
            </span>
            <dl className={styles.paymentFields}>
              <div>
                <dt>مبلغ کل</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
              <div>
                <dt>درگاه پرداخت</dt>
                <dd>
                  {order.payment.provider === "fake"
                    ? "درگاه آزمایشی"
                    : order.payment.provider === "zarinpal"
                      ? "زرین‌پال"
                      : "ثبت نشده"}
                </dd>
              </div>
              {order.payment.paidAt && (
                <div>
                  <dt>تاریخ پرداخت</dt>
                  <dd>
                    <time dateTime={order.payment.paidAt}>
                      {formatDateTime(order.payment.paidAt)}
                    </time>
                  </dd>
                </div>
              )}
            </dl>
            {(order.payment.authority || order.payment.refId) && (
              <details className={styles.paymentDetails}>
                <summary>نمایش شناسه‌های پرداخت</summary>
                {order.payment.authority && (
                  <p>
                    شناسه درخواست پرداخت:{" "}
                    <bdi>{toPersianDigits(order.payment.authority)}</bdi>
                    <CopyValue
                      value={order.payment.authority}
                      label="شناسه درخواست پرداخت"
                    />
                  </p>
                )}
                {order.payment.refId && (
                  <p>
                    شناسه پرداخت:{" "}
                    <bdi>{toPersianDigits(order.payment.refId)}</bdi>
                    <CopyValue
                      value={order.payment.refId}
                      label="شناسه پرداخت"
                    />
                  </p>
                )}
              </details>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
