import type { OrderStatus, PaymentStatus } from "@/types/domain";
import { toPersianDigits } from "@/lib/format";

export function OrderDelivery({
  status,
  paymentStatus,
}: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  if (status === "cancelled") return <>این سفارش لغو شده است.</>;
  if (paymentStatus !== "paid")
    return <>زمان تحویل پس از پرداخت موفق مشخص می‌شود.</>;
  if (status === "delivered") return <>سفارش شما تحویل داده شده است.</>;
  return (
    <>
      زمان تقریبی تحویل: حدود {toPersianDigits(1)} هفته. وضعیت ارسال در صفحهٔ
      سفارش به‌روز می‌شود.
    </>
  );
}
