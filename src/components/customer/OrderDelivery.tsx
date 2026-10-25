import type { OrderStatus, PaymentStatus, PaymentMethod } from "@/types/domain";
import { toPersianDigits } from "@/lib/format";

export function OrderDelivery({
  status,
  paymentStatus,
  paymentMethod,
}: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
}) {
  if (status === "cancelled") return <>این سفارش لغو شده است.</>;
  if (status === "delivered") return <>سفارش شما تحویل داده شده است.</>;
  if (status === "shipped")
    return (
      <>
        سفارش شما ارسال شده است. زمان تقریبی تحویل: حدود {toPersianDigits(1)}{" "}
        هفته.
      </>
    );
  if (paymentStatus !== "paid" && paymentMethod !== "cash_on_delivery")
    return (
      <>
        پرداخت این سفارش هنوز تأیید نشده است؛ زمان تقریبی تحویل پس از تأیید
        پرداخت مشخص می‌شود.
      </>
    );
  return (
    <>
      زمان تقریبی تحویل: حدود {toPersianDigits(1)} هفته. وضعیت ارسال در صفحهٔ
      سفارش به‌روز می‌شود.
    </>
  );
}
