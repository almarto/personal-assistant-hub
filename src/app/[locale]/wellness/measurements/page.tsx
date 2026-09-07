import { requireFamilyMembership } from "@/lib/auth-guards";
import { getMeasurements } from "@/lib/services/wellness/measurements";

import MeasurementsClient from "./MeasurementsClient";

export default async function MeasurementsPage() {
  const { userId } = await requireFamilyMembership();
  const entries = await getMeasurements(userId);
  return <MeasurementsClient initialEntries={entries} />;
}
