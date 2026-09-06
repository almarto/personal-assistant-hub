import { requireFamilyMembership } from "@/lib/auth-guards";
import { getMeasurements } from "@/lib/services/wellness/measurements";

import MedidasClient from "./MedidasClient";

export default async function MedidasPage() {
  const { userId } = await requireFamilyMembership();
  const entries = await getMeasurements(userId);
  return <MedidasClient initialEntries={entries} />;
}
