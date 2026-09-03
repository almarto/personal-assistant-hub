"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  createAttributeValueAction,
  deleteTripAction,
  removeParticipantAction,
  updateTripAction,
} from "@/app/actions/trips";
import { useRouter } from "@/i18n/routing";
import { TripAttributeValue, TripWithDetails } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";
import { InviteParticipantModal } from "./InviteParticipantModal";

interface EditTripModalProps {
  trip: TripWithDetails;
  attributeValues: TripAttributeValue[];
  onClose: () => void;
}

export function EditTripModal({ trip, attributeValues: initialValues, onClose }: EditTripModalProps) {
  const t = useTranslations("TripPlanner");
  const router = useRouter();

  const [attributeValues, setAttributeValues] = useState(initialValues);
  const [vehicleId, setVehicleId] = useState(trip.vehicle_value_id || "");
  const [overnightId, setOvernightId] = useState(trip.overnight_value_id || "");
  const [activityIds, setActivityIds] = useState(trip.activities.map((a) => a.id));
  const [newValueName, setNewValueName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicles = attributeValues.filter((v) => v.category === "vehicle");
  const overnightStyles = attributeValues.filter((v) => v.category === "overnight_style");
  const activities = attributeValues.filter((v) => v.category === "activity");

  const addAttributeValue = async (category: "vehicle" | "overnight_style" | "activity") => {
    if (!newValueName.trim()) return;
    const result = await createAttributeValueAction({ category, name: newValueName.trim() });
    if (result.error || !result.value) {
      setError(result.error);
      return;
    }
    setAttributeValues((prev) => [...prev, result.value!]);
    setNewValueName("");
  };

  const toggleActivity = (id: string) => {
    setActivityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updateTripAction(trip.id, {
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      vehicle_value_id: vehicleId || null,
      overnight_value_id: overnightId || null,
      activity_value_ids: activityIds,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(t("confirmDelete"))) return;
    await deleteTripAction(trip.id);
    router.push("/trip-planner");
  };

  const handleRemoveParticipant = async (participantId: string) => {
    await removeParticipantAction(trip.id, participantId);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{t("editTrip")}</h3>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>{t("name")}</label>
            <input name="name" defaultValue={trip.name} required style={{ width: "100%", padding: "0.5rem" }} />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label>{t("startDate")}</label>
              <input name="start_date" type="date" defaultValue={trip.start_date || ""} style={{ width: "100%", padding: "0.5rem" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>{t("endDate")}</label>
              <input name="end_date" type="date" defaultValue={trip.end_date || ""} style={{ width: "100%", padding: "0.5rem" }} />
            </div>
          </div>
          <div>
            <label>{t("notes")}</label>
            <textarea name="notes" defaultValue={trip.notes || ""} style={{ width: "100%", padding: "0.5rem" }} />
          </div>

          <div>
            <label>{t("vehicle")}</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              <option value="">--</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>{t("overnightStyle")}</label>
            <select value={overnightId} onChange={(e) => setOvernightId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              <option value="">--</option>
              {overnightStyles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>{t("activities")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {activities.map((a) => (
                <label key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <input type="checkbox" checked={activityIds.includes(a.id)} onChange={() => toggleActivity(a.id)} />
                  {a.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={newValueName}
              onChange={(e) => setNewValueName(e.target.value)}
              placeholder={t("createNewPlaceholder")}
              style={{ flex: 1, padding: "0.5rem" }}
            />
            <Button type="button" variant="outline" onClick={() => addAttributeValue("activity")}>
              {t("createNew")}
            </Button>
          </div>

          <div>
            <label>{t("participants")}</label>
            <ul>
              {trip.participants.map((p) => (
                <li key={p.id}>
                  {p.display_name} ({p.email}){" "}
                  <button type="button" onClick={() => handleRemoveParticipant(p.id)}>
                    {t("remove")}
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => setInviting(true)}>
              {t("inviteParticipant")}
            </Button>
          </div>

          {error && <p style={{ color: "#ef4444" }}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={handleDelete}>
              {t("delete")}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </div>
        </form>
      </div>

      {inviting && <InviteParticipantModal tripId={trip.id} onClose={() => setInviting(false)} />}
    </div>
  );
}
