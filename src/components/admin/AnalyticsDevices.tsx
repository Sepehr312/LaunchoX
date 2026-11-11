import { formatNumber } from "@/lib/format";
import { MonitorSmartphone } from "lucide-react";
import styles from "@/components/admin/AnalyticsDashboard.module.css";

const deviceLabels: Record<string, string> = {
  mobile: "موبایل",
  tablet: "تبلت",
  desktop: "کامپیوتر",
  "(not set)": "نامشخص",
  "": "نامشخص",
};

export function AnalyticsDevices({
  devices,
}: {
  devices: { category: string; activeUsers: number }[];
}) {
  return (
    <section className="admin-panel">
      <h2 className={styles.panelTitle}>
        <MonitorSmartphone size={21} aria-hidden="true" />
        نوع دستگاه کاربران
      </h2>
      <p className={styles.meta}>
        کاربران فعال به تفکیک نوع دستگاه در بازهٔ انتخابی · واحد: کاربر فعال
      </p>
      {devices.length === 0 ? (
        <p className={styles.empty}>در این بازه نوع دستگاهی گزارش نشده است.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <caption className="sr-only">
              کاربران فعال بر اساس نوع دستگاه
            </caption>
            <thead>
              <tr>
                <th scope="col">نوع دستگاه</th>
                <th scope="col">کاربران فعال</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, index) => (
                <tr key={`${device.category}:${index}`}>
                  <th scope="row">
                    {deviceLabels[device.category.toLowerCase()] ??
                      "سایر دستگاه‌ها"}
                  </th>
                  <td>{formatNumber(device.activeUsers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.notice}>
        این گزارش نوع کلی دستگاه را نشان می‌دهد. جمع کاربران دستگاه‌ها الزاماً
        برابر کل کاربران یکتا نیست.
      </p>
    </section>
  );
}
