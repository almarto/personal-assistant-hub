import { redirect } from "@/i18n/routing";
import { todayWeekday } from "@/lib/services/wellness/date";

export default async function EatingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: `/wellness/eating/${todayWeekday()}`, locale });
}
