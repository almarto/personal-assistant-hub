import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getTrips } from "@/lib/services/trips";
import { isAdmin } from "@/lib/types/roles";
import { TripListItem } from "@/lib/types/trips";
import { formatTripDate } from "@/lib/utils/format-date";
import { Badge } from "@/systemUI/components/Badge/Badge";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "./page.module.css";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function TripGrid({ trips, t }: { trips: TripListItem[]; t: Translate }) {
  if (trips.length === 0) {
    return <div className={styles.emptyState}>{t("noTrips")}</div>;
  }
  return (
    <div className={styles.grid}>
      {trips.map((trip) => (
        <Link key={trip.id} href={`/trips/${trip.id}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{trip.name}</h3>
          <p className={styles.cardSubtitle}>
            {trip.start_date ? formatTripDate(trip.start_date) : "?"}
            {trip.end_date && ` - ${formatTripDate(trip.end_date)}`}
          </p>
          <div className={styles.badges}>
            {trip.vehicleName && <Badge variant="primary">{trip.vehicleName}</Badge>}
            {trip.overnightName && <Badge variant="secondary">{trip.overnightName}</Badge>}
            {trip.activityNames.map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
          {trip.participantId && (
            <span className={styles.progressHint}>
              {t("packed", { packed: trip.packed, total: trip.total })}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default async function TripPlannerPage() {
  const t = await getTranslations("TripPlanner");
  const session = await auth.api.getSession({ headers: await headers() });
  const admin = isAdmin(session?.user.role);
  const trips = await getTrips(session!.user.id, admin);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((trip) => !trip.end_date || trip.end_date >= today);
  const past = trips.filter((trip) => !!trip.end_date && trip.end_date < today);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        {admin && (
          <Link href="/trip-planner/trips/new">
            <Button>{t("newTrip")}</Button>
          </Link>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("upcoming")}</h2>
        <TripGrid trips={upcoming} t={t} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("past")}</h2>
        <TripGrid trips={past} t={t} />
      </div>
    </div>
  );
}
