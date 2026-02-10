"use client";

import { ChevronLeft, ChevronRight, Lock, Users } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  type DayOfWeek,
  getDisplayWeekStartDate,
  getWeekStartDate,
  isWeekInPast,
  type Location,
  type ScheduleSlot,
  type SlotType,
  type WeekSchedule,
} from "@/lib/utils/schedule";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "./page.module.css";
import { SlotEditorModal } from "./SlotEditorModal";

interface ScheduleClientProps {
  weekSchedule: WeekSchedule;
  prevWeek: string;
  nextWeek: string;
}

const DAYS: { key: string; dayOfWeek: DayOfWeek }[] = [
  { key: "monday", dayOfWeek: 1 },
  { key: "tuesday", dayOfWeek: 2 },
  { key: "wednesday", dayOfWeek: 3 },
  { key: "thursday", dayOfWeek: 4 },
  { key: "friday", dayOfWeek: 5 },
  { key: "saturday", dayOfWeek: 6 },
];

const LOCATION_COLORS: Record<Location, { bg: string; text: string; emoji: string }> = {
  Manises: { bg: "#dbeafe", text: "#1e40af", emoji: "🏭" },
  Quart: { bg: "#dcfce7", text: "#166534", emoji: "🏢" },
  Casa: { bg: "#fef3c7", text: "#92400e", emoji: "🏠" },
};

const PERSON_COLORS = {
  patricia: { bg: "#fce7f3", text: "#9d174d", emoji: "👩" },
  alberto: { bg: "#e0e7ff", text: "#3730a3", emoji: "👨" },
};

export default function ScheduleClient({
  weekSchedule,
  prevWeek,
  nextWeek,
}: ScheduleClientProps) {
  const t = useTranslations("Schedule");
  const router = useRouter();
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);

  const isPast = isWeekInPast(weekSchedule.weekStartDate);
  const currentWeekStart = getWeekStartDate(new Date());
  const displayWeekStart = getDisplayWeekStartDate();
  const isCurrentWeek = weekSchedule.weekStartDate === currentWeekStart || weekSchedule.weekStartDate === displayWeekStart;

  const getSlot = (dayOfWeek: DayOfWeek, slotType: SlotType): ScheduleSlot | undefined => {
    return weekSchedule.slots.find(
      (s) => s.day_of_week === dayOfWeek && s.slot_type === slotType
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const navigateToWeek = (week: string) => {
    router.push(`/schedule?week=${week}`);
  };

  const getDayOfMonth = (dayOfWeek: DayOfWeek): number => {
    const date = new Date(weekSchedule.weekStartDate);
    date.setDate(date.getDate() + (dayOfWeek - 1));
    return date.getDate();
  };

  const handleSlotClick = (dayOfWeek: DayOfWeek) => {
    if (!isPast) {
      setEditingDay(dayOfWeek);
    }
  };

  const renderPersonLocation = (
    person: "patricia" | "alberto",
    location: Location | undefined
  ) => {
    if (!location) return null;
    const locColor = LOCATION_COLORS[location];
    const personColor = PERSON_COLORS[person];

    return (
      <div className={styles.personLocation}>
        <span
          className={styles.personBadge}
          style={{ backgroundColor: personColor.bg, color: personColor.text }}
        >
          {personColor.emoji} {t(`people.${person}`)}
        </span>
        <span
          className={styles.locationBadge}
          style={{ backgroundColor: locColor.bg, color: locColor.text }}
        >
          {locColor.emoji} {t(`locations.${location}`)}
        </span>
      </div>
    );
  };

  const renderSlot = (slot: ScheduleSlot | undefined, slotType: SlotType) => {
    if (!slot) {
      return (
        <div className={styles.emptySlot}>
          <span className={styles.notSet}>{t("notSet")}</span>
        </div>
      );
    }

    const formatTime = (time: string | null) => {
      if (!time) return "";
      return time.slice(0, 5); // Get HH:MM from HH:MM:SS
    };

    return (
      <div className={styles.slotContent}>
        {renderPersonLocation("patricia", slot.patricia_location)}
        {renderPersonLocation("alberto", slot.alberto_location)}
        {slot.parents_needed && (
          <div className={styles.parentsNeeded}>
            <Users size={14} />
            <span>{t("parentsNeeded")}</span>
            {slot.parents_needed_start_time && slot.parents_needed_end_time && (
              <span className={styles.parentsTime}>
                ({formatTime(slot.parents_needed_start_time)} - {formatTime(slot.parents_needed_end_time)})
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <div className={styles.navigation}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToWeek(prevWeek)}
            leftIcon={<ChevronLeft size={16} />}
          >
            {t("previousWeek")}
          </Button>
          <span className={styles.weekLabel}>
            {t("weekOf", { date: formatDate(weekSchedule.weekStartDate) })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToWeek(nextWeek)}
            rightIcon={<ChevronRight size={16} />}
          >
            {t("nextWeek")}
          </Button>
        </div>
        {!isCurrentWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/schedule")}
          >
            {t("currentWeek")}
          </Button>
        )}
        {isPast && (
          <div className={styles.readOnlyBadge}>
            <Lock size={14} />
            <span>{t("readOnly")}</span>
          </div>
        )}
      </div>

      <div className={styles.calendar}>
        {DAYS.map(({ key, dayOfWeek }) => {
          const morningSlot = getSlot(dayOfWeek, "morning");
          const afternoonSlot = getSlot(dayOfWeek, "afternoon");
          const isSaturday = dayOfWeek === 6;

          return (
            <div
              key={key}
              className={`${styles.dayColumn} ${!isPast ? styles.clickable : ""}`}
              onClick={() => handleSlotClick(dayOfWeek)}
            >
              <div className={styles.dayHeader}>
                {t(`days.${key}`)} {getDayOfMonth(dayOfWeek)}
              </div>

              <div className={styles.slotContainer}>
                <div className={styles.slotLabel}>{t("morning")}</div>
                {renderSlot(morningSlot, "morning")}
              </div>

              {!isSaturday && (
                <div className={styles.slotContainer}>
                  <div className={styles.slotLabel}>{t("afternoon")}</div>
                  {renderSlot(afternoonSlot, "afternoon")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isPast && (
        <p className={styles.hint}>{t("clickToEdit")}</p>
      )}

      {editingDay !== null && (
        <SlotEditorModal
          weekStartDate={weekSchedule.weekStartDate}
          dayOfWeek={editingDay}
          morningSlot={getSlot(editingDay, "morning")}
          afternoonSlot={editingDay !== 6 ? getSlot(editingDay, "afternoon") : undefined}
          onClose={() => setEditingDay(null)}
        />
      )}
    </div>
  );
}
