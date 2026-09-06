import { requireFamilyMembership } from "@/lib/auth-guards";
import { getDayForUser } from "@/lib/services/wellness/eating";
import { getActivePlanProfiles } from "@/lib/services/wellness/plans";

import ComerClient from "./ComerClient";

const WEEKDAY_LABELS: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

export default async function ComerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();

  const { weekday, meals } = await getDayForUser(userId, familyId, date);
  const profiles = await getActivePlanProfiles(familyId);
  const myProfile = profiles.find((p) => p.user_id === userId);

  return (
    <ComerClient
      dateStr={date.toISOString().slice(0, 10)}
      weekdayLabel={WEEKDAY_LABELS[weekday]}
      meals={meals}
      dailyTargetKcal={myProfile?.daily_kcal ?? 0}
      dailyTargetProtein={myProfile?.daily_protein_g ?? 0}
    />
  );
}
