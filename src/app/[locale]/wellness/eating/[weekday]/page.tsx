import { notFound } from "next/navigation";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { isWeekday, todayWeekday } from "@/lib/services/wellness/date";
import { getDayForUser } from "@/lib/services/wellness/eating";
import { getActivePlanProfiles } from "@/lib/services/wellness/plans";

import EatingClient from "../EatingClient";

export default async function EatingDayPage({
  params,
}: {
  params: Promise<{ weekday: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { weekday: weekdayParam } = await params;
  if (!isWeekday(weekdayParam)) notFound();
  const weekday = weekdayParam;

  const { meals } = await getDayForUser(userId, familyId, weekday);
  const profiles = await getActivePlanProfiles(familyId);
  const myProfile = profiles.find((p) => p.user_id === userId);

  return (
    <EatingClient
      weekday={weekday}
      isToday={weekday === todayWeekday()}
      meals={meals}
      dailyTargetKcal={myProfile?.daily_kcal ?? 0}
      dailyTargetProtein={myProfile?.daily_protein_g ?? 0}
    />
  );
}
