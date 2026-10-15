"use client";
import { CustomerError } from "@/components/customer/CustomerError";
export default function Error({ reset }: { reset: () => void }) {
  return <CustomerError reset={reset} />;
}
