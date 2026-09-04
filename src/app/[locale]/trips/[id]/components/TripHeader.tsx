"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/routing";
import { TripAttributeValue, TripWithDetails } from "@/lib/types/trips";
import { formatTripDate } from "@/lib/utils/format-date";
import { Badge } from "@/systemUI/components/Badge/Badge";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";
import { EditTripModal } from "./EditTripModal";

interface TripHeaderProps {
  trip: TripWithDetails;
  attributeValues: TripAttributeValue[];
  isAdmin: boolean;
}

export function TripHeader({ trip, attributeValues, isAdmin }: TripHeaderProps) {
  const t = useTranslations("TripPlanner");
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Link href="/trip-planner" className={styles.backLink}>
        &larr; {t("title")}
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{trip.name}</h1>
          <div className={styles.subtitle}>
            {trip.start_date ? formatTripDate(trip.start_date) : "?"}
            {trip.end_date && ` - ${formatTripDate(trip.end_date)}`}
          </div>
          <div className={styles.badges}>
            {trip.vehicle && <Badge variant="primary">{trip.vehicle.name}</Badge>}
            {trip.overnight && <Badge variant="secondary">{trip.overnight.name}</Badge>}
            {trip.activities.map((a) => (
              <Badge key={a.id} variant="outline">
                {a.name}
              </Badge>
            ))}
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t("editTrip")}
          </Button>
        )}
      </div>

      {editing && (
        <EditTripModal trip={trip} attributeValues={attributeValues} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
