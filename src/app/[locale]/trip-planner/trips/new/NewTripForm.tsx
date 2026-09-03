"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { createAttributeValueAction, createTripAction } from "@/app/actions/trips";
import { useRouter } from "@/i18n/routing";
import { TripAttributeValue } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

interface NewTripFormProps {
  attributeValues: TripAttributeValue[];
}

interface ParticipantRow {
  email: string;
  display_name: string;
}

export function NewTripForm({ attributeValues: initialValues }: NewTripFormProps) {
  const t = useTranslations("TripPlanner");
  const router = useRouter();

  const [attributeValues, setAttributeValues] = useState(initialValues);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [overnightId, setOvernightId] = useState<string>("");
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newOvernightName, setNewOvernightName] = useState("");
  const [newActivityName, setNewActivityName] = useState("");
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vehicles = attributeValues.filter((v) => v.category === "vehicle");
  const overnightStyles = attributeValues.filter((v) => v.category === "overnight_style");
  const activities = attributeValues.filter((v) => v.category === "activity");

  const addAttributeValue = async (category: "vehicle" | "overnight_style" | "activity", name: string) => {
    if (!name.trim()) return;
    const result = await createAttributeValueAction({ category, name: name.trim() });
    if (result.error || !result.value) {
      setError(result.error);
      return;
    }
    setAttributeValues((prev) => [...prev, result.value!]);
    if (category === "vehicle") {
      setVehicleId(result.value.id);
      setNewVehicleName("");
    } else if (category === "overnight_style") {
      setOvernightId(result.value.id);
      setNewOvernightName("");
    } else {
      setActivityIds((prev) => [...prev, result.value!.id]);
      setNewActivityName("");
    }
  };

  const toggleActivity = (id: string) => {
    setActivityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const addParticipant = () => {
    if (!participantEmail.trim() || !participantName.trim()) return;
    setParticipants((prev) => [...prev, { email: participantEmail.trim(), display_name: participantName.trim() }]);
    setParticipantEmail("");
    setParticipantName("");
  };

  const removeParticipant = (email: string) => {
    setParticipants((prev) => prev.filter((p) => p.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await createTripAction({
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      vehicle_value_id: vehicleId || null,
      overnight_value_id: overnightId || null,
      activity_value_ids: activityIds,
      participants,
    });
    setSubmitting(false);
    if (result.error || !result.tripId) {
      setError(result.error);
      return;
    }
    router.push(`/trips/${result.tripId}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 560 }}>
      <div>
        <label>{t("name")}</label>
        <input name="name" required style={{ width: "100%", padding: "0.5rem" }} />
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label>{t("startDate")}</label>
          <input name="start_date" type="date" style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>{t("endDate")}</label>
          <input name="end_date" type="date" style={{ width: "100%", padding: "0.5rem" }} />
        </div>
      </div>
      <div>
        <label>{t("notes")}</label>
        <textarea name="notes" style={{ width: "100%", padding: "0.5rem" }} />
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
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            value={newVehicleName}
            onChange={(e) => setNewVehicleName(e.target.value)}
            placeholder={t("createNewPlaceholder")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={() => addAttributeValue("vehicle", newVehicleName)}>
            {t("createNew")}
          </Button>
        </div>
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
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            value={newOvernightName}
            onChange={(e) => setNewOvernightName(e.target.value)}
            placeholder={t("createNewPlaceholder")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={() => addAttributeValue("overnight_style", newOvernightName)}>
            {t("createNew")}
          </Button>
        </div>
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
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            value={newActivityName}
            onChange={(e) => setNewActivityName(e.target.value)}
            placeholder={t("createNewPlaceholder")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={() => addAttributeValue("activity", newActivityName)}>
            {t("createNew")}
          </Button>
        </div>
      </div>

      <div>
        <label>{t("participants")}</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder={t("displayName")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <input
            value={participantEmail}
            onChange={(e) => setParticipantEmail(e.target.value)}
            placeholder={t("email")}
            type="email"
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={addParticipant}>
            {t("inviteParticipant")}
          </Button>
        </div>
        <ul>
          {participants.map((p) => (
            <li key={p.email}>
              {p.display_name} ({p.email}){" "}
              <button type="button" onClick={() => removeParticipant(p.email)}>
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      <Button type="submit" disabled={submitting}>
        {t("create")}
      </Button>
    </form>
  );
}
