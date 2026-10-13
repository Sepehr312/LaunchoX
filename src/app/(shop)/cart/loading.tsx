import { CustomerScope } from "@/components/customer/CustomerScope";
import { PageLoading } from "@/components/ui/PageLoading";
export default function Loading() {
  return (
    <CustomerScope>
      <PageLoading title="در حال دریافت سبد خرید…" view="detail" shell />
    </CustomerScope>
  );
}
