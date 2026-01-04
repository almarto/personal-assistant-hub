"use client";

import { useTranslations } from "next-intl";

import {
  calculateAge,
  calculateDaysToNextMonthversary,
  formatAge,
} from "@/lib/utils/date";
import { Badge } from "@/systemUI/components/Badge/Badge";

interface BabyAgeBadgeProps {
  birthDate: string | Date;
}

export const BabyAgeBadge = ({ birthDate }: BabyAgeBadgeProps) => {
  const t = useTranslations("Common");
  const age = calculateAge(birthDate);
  const daysLeft = calculateDaysToNextMonthversary(birthDate);

  const ageString = formatAge(age, t);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
        marginLeft: "auto",
      }}
    >
      <Badge variant="secondary">{ageString}</Badge>
      <Badge
        variant="outline"
        style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem" }}
      >
        {daysLeft === 0 ? t("today") : t("daysLeft", { count: daysLeft })}
      </Badge>
    </div>
  );
};
