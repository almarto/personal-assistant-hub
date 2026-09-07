import { notFound } from "next/navigation";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { slugToWeekday, todayWeekdaySlug, WEEKDAY_LABELS } from "@/lib/services/wellness/date";
import { getDayForUser } from "@/lib/services/wellness/eating";
import { getActivePlanProfiles } from "@/lib/services/wellness/plans";

import ComerClient from "../ComerClient";

export default async function ComerDayPage({
  params,
}: {
  params: Promise<{ weekday: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { weekday: weekdaySlug } = await params;
  const weekday = slugToWeekday(weekdaySlug);
  if (!weekday) notFound();

  const { meals } = await getDayForUser(userId, familyId, weekday);
  const profiles = await getActivePlanProfiles(familyId);
  const myProfile = profiles.find((p) => p.user_id === userId);

  return (
    <ComerClient
      weekdaySlug={weekdaySlug}
      weekdayLabel={WEEKDAY_LABELS[weekday]}
      isToday={weekdaySlug === todayWeekdaySlug()}
      meals={meals}
      dailyTargetKcal={myProfile?.daily_kcal ?? 0}
      dailyTargetProtein={myProfile?.daily_protein_g ?? 0}
    />
  );
}
