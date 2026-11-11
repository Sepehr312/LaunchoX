import { formatNumber } from "@/lib/format";
import { MapPin } from "lucide-react";
import styles from "@/components/admin/AnalyticsDashboard.module.css";

export function AnalyticsCities({
  cities,
}: {
  cities: { city: string; activeUsers: number }[];
}) {
  return (
    <section className="admin-panel">
      <h2 className={styles.panelTitle}>
        <MapPin size={21} aria-hidden="true" />
        کاربران فعال به تفکیک شهر
      </h2>
      <p className={styles.meta}>
        حداکثر {formatNumber(10)} شهر برتر در بازهٔ انتخابی · واحد: کاربر فعال
      </p>
      {cities.length === 0 ? (
        <p className={styles.empty}>در این بازه شهری گزارش نشده است.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <caption className="sr-only">
              شهرهای کاربران فعال در بازهٔ انتخابی
            </caption>
            <thead>
              <tr>
                <th scope="col">شهر</th>
                <th scope="col">کاربران فعال</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((item, index) => (
                <tr key={`${item.city}:${index}`}>
                  <th scope="row">
                    <bdi>
                      {!item.city || item.city === "(not set)"
                        ? "نامشخص"
                        : item.city}
                    </bdi>
                  </th>
                  <td>{formatNumber(item.activeUsers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.notice}>
        شهر بر اساس موقعیت تشخیص‌داده‌شدهٔ گوگل است؛ VPN و محدودیت‌های حریم
        خصوصی ممکن است نتیجه را تغییر دهند. جمع کاربران شهرها الزاماً برابر کل
        کاربران نیست.
      </p>
    </section>
  );
}
