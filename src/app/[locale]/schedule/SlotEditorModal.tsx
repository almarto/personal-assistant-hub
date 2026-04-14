"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveDayScheduleAction } from "@/app/actions/schedule";
import { useRouter } from "@/i18n/routing";
import {
  type DayOfWeek,
  type Location,
  type ScheduleSlot,
} from "@/lib/utils/schedule";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "./SlotEditorModal.module.css";

interface SlotEditorModalProps {
  weekStartDate: string;
  dayOfWeek: DayOfWeek;
  morningSlot?: ScheduleSlot;
  afternoonSlot?: ScheduleSlot;
  onClose: () => void;
}

const LOCATIONS: Location[] = ["Manises", "Quart", "Casa"];

const DAY_KEYS: Record<DayOfWeek, string> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const TIME_OPTIONS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export function SlotEditorModal({
  weekStartDate,
  dayOfWeek,
  morningSlot,
  afternoonSlot,
  onClose,
}: SlotEditorModalProps) {
  const t = useTranslations("Schedule");
  const router = useRouter();
  const isSaturday = dayOfWeek === 6;

  // Morning state
  const [morningPatricia, setMorningPatricia] = useState<Location>(
    morningSlot?.patricia_location || "Casa"
  );
  const [morningAlberto, setMorningAlberto] = useState<Location>(
    morningSlot?.alberto_location || "Casa"
  );
  const [morningParentsNeeded, setMorningParentsNeeded] = useState(
    morningSlot?.parents_needed || false
  );
  const [morningParentsStart, setMorningParentsStart] = useState(
    morningSlot?.parents_needed_start_time?.slice(0, 5) || "09:00"
  );
  const [morningParentsEnd, setMorningParentsEnd] = useState(
    morningSlot?.parents_needed_end_time?.slice(0, 5) || "13:00"
  );

  // Afternoon state
  const [afternoonPatricia, setAfternoonPatricia] = useState<Location>(
    afternoonSlot?.patricia_location || "Casa"
  );
  const [afternoonAlberto, setAfternoonAlberto] = useState<Location>(
    afternoonSlot?.alberto_location || "Casa"
  );
  const [afternoonParentsNeeded, setAfternoonParentsNeeded] = useState(
    afternoonSlot?.parents_needed || false
  );
  const [afternoonParentsStart, setAfternoonParentsStart] = useState(
    afternoonSlot?.parents_needed_start_time?.slice(0, 5) || "15:00"
  );
  const [afternoonParentsEnd, setAfternoonParentsEnd] = useState(
    afternoonSlot?.parents_needed_end_time?.slice(0, 5) || "19:00"
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveDayScheduleAction({
        weekStartDate,
        dayOfWeek,
        morningPatriciaLocation: morningPatricia,
        morningAlbertoLocation: morningAlberto,
        morningParentsNeeded,
        morningParentsNeededStartTime: morningParentsNeeded ? morningParentsStart : null,
        morningParentsNeededEndTime: morningParentsNeeded ? morningParentsEnd : null,
        ...(isSaturday
          ? {}
          : {
              afternoonPatriciaLocation: afternoonPatricia,
              afternoonAlbertoLocation: afternoonAlberto,
              afternoonParentsNeeded,
              afternoonParentsNeededStartTime: afternoonParentsNeeded
                ? afternoonParentsStart
                : null,
              afternoonParentsNeededEndTime: afternoonParentsNeeded
                ? afternoonParentsEnd
                : null,
            }),
      });

      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error || "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const renderLocationSelect = (
    label: string,
    value: Location,
    onChange: (loc: Location) => void
  ) => (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label}</label>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as Location)}
      >
        {LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>
            {t(`locations.${loc}`)}
          </option>
        ))}
      </select>
    </div>
  );

  const renderSlotForm = (
    slotLabel: string,
    patriciaValue: Location,
    setPatricia: (loc: Location) => void,
    albertoValue: Location,
    setAlberto: (loc: Location) => void,
    parentsNeeded: boolean,
    setParentsNeeded: (val: boolean) => void,
    parentsStart: string,
    setParentsStart: (val: string) => void,
    parentsEnd: string,
    setParentsEnd: (val: string) => void
  ) => (
    <div className={styles.slotSection}>
      <h4 className={styles.slotTitle}>{slotLabel}</h4>
      <div className={styles.locationGrid}>
        {renderLocationSelect(
          `${t("people.patricia")}`,
          patriciaValue,
          setPatricia
        )}
        {renderLocationSelect(
          `${t("people.alberto")}`,
          albertoValue,
          setAlberto
        )}
      </div>
      <div className={styles.parentsSection}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={parentsNeeded}
            onChange={(e) => setParentsNeeded(e.target.checked)}
          />
          <span>{t("parentsNeeded")}</span>
        </label>
        {parentsNeeded && (
          <div className={styles.timeRange}>
            <div className={styles.timeField}>
              <label>{t("from")}</label>
              <select
                value={parentsStart}
                onChange={(e) => setParentsStart(e.target.value)}
                className={styles.timeSelect}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.timeField}>
              <label>{t("to")}</label>
              <select
                value={parentsEnd}
                onChange={(e) => setParentsEnd(e.target.value)}
                className={styles.timeSelect}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={handleModalClick}>
        <div className={styles.header}>
          <h3>{t("editDay", { day: t(`days.${DAY_KEYS[dayOfWeek]}`) })}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {renderSlotForm(
            t("morning"),
            morningPatricia,
            setMorningPatricia,
            morningAlberto,
            setMorningAlberto,
            morningParentsNeeded,
            setMorningParentsNeeded,
            morningParentsStart,
            setMorningParentsStart,
            morningParentsEnd,
            setMorningParentsEnd
          )}

          {!isSaturday &&
            renderSlotForm(
              t("afternoon"),
              afternoonPatricia,
              setAfternoonPatricia,
              afternoonAlberto,
              setAfternoonAlberto,
              afternoonParentsNeeded,
              setAfternoonParentsNeeded,
              afternoonParentsStart,
              setAfternoonParentsStart,
              afternoonParentsEnd,
              setAfternoonParentsEnd
            )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className={styles.spinner} /> : null}
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
