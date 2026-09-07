import { redirect } from "@/i18n/routing";
import { todayWeekdaySlug } from "@/lib/services/wellness/date";

export default async function ComerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: `/wellness/comer/${todayWeekdaySlug()}`, locale });
}
