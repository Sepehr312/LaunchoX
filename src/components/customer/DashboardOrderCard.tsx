import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CopyOrderNumber } from "@/components/customer/CopyOrderNumber";
import { OrderBadge } from "@/components/customer/OrderBadge";
import { OrderDelivery } from "@/components/customer/OrderDelivery";
import { OrderProgress } from "@/components/customer/OrderProgress";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import type { OrderDTO } from "@/types/dto";
import styles from "@/components/customer/dashboard.module.css";

export function DashboardOrderCard({
  order,
  progress = false,
}: {
  order: OrderDTO;
  progress?: boolean;
}) {
  return (
    <article className={styles.order}>
      <header>
        <div>
          <strong>
            سفارش <CopyOrderNumber number={order.orderNumber} />
          </strong>
          <small>{formatDate(order.createdAt)}</small>
        </div>
        <OrderBadge status={order.status} />
      </header>
      <div className={styles.orderBody}>
        <div className={styles.items}>
          {order.items.map((item, index) => (
            <div className={styles.item} key={`${item.product}-${index}`}>
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.title}
                  width={64}
                  height={76}
                  unoptimized
                />
              )}
              <div>
                <strong>{item.title}</strong>
                <small>تعداد: {toPersianDigits(item.quantity)}</small>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.amount}>
          <small>مبلغ سفارش</small>
          <strong>{formatPrice(order.total)}</strong>
        </div>
      </div>
      {progress && <OrderProgress status={order.status} />}
      <footer>
        <span>
          <OrderDelivery
            status={order.status}
            paymentStatus={order.payment.status}
          />
        </span>
        <Link href={`/account/orders/${order.id}`}>
          جزئیات و پیگیری <ArrowLeft size={16} />
        </Link>
      </footer>
    </article>
  );
}
