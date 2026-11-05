import type { Metadata } from "next";
import { readContent } from "@/services/content.service";
import { ManagedPage } from "@/components/store/ManagedPage";
import { defaultAboutPage } from "@/components/store/about-defaults";

export const metadata: Metadata = {
  title: "درباره ما | لانچ‌اوکس",
  description:
    "با نگاه لانچ‌اوکس به انتخاب آگاهانه یخچال آشنا شوید؛ توجه به نیاز خانه، مشخصات روشن و خریدی سنجیده‌تر.",
};

export default async function AboutPage() {
  const saved = await readContent("about");
  const page = saved?.key === "about" ? saved.data : defaultAboutPage;
  return <ManagedPage page={page} appearance="about" />;
}
