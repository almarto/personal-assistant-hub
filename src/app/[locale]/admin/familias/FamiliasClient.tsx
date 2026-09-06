"use client";

import { useState } from "react";

import {
  addFamilyMemberAction,
  createFamilyAction,
  removeFamilyMemberAction,
} from "@/app/actions/wellness/families";

import styles from "./page.module.css";

interface FamilyMember {
  user_id: string;
  name: string;
  email: string;
}

interface FamilyWithMembers {
  id: string;
  name: string;
  members: FamilyMember[];
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function FamiliasClient({
  initialFamilies,
  allUsers,
}: {
  initialFamilies: FamilyWithMembers[];
  allUsers: UserOption[];
}) {
  const [families, setFamilies] = useState(initialFamilies);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [selectedUserByFamily, setSelectedUserByFamily] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleCreateFamily() {
    if (!newFamilyName.trim()) return;
    const family = await createFamilyAction(newFamilyName.trim());
    setFamilies((prev) => [{ id: family.id, name: family.name, members: [] }, ...prev]);
    setNewFamilyName("");
  }

  async function handleAddMember(familyId: string) {
    const userId = selectedUserByFamily[familyId];
    if (!userId) return;
    setError(null);
    try {
      await addFamilyMemberAction(familyId, userId);
      const user = allUsers.find((u) => u.id === userId);
      if (!user) return;
      setFamilies((prev) =>
        prev.map((f) =>
          f.id === familyId
            ? { ...f, members: [...f.members, { user_id: user.id, name: user.name, email: user.email }] }
            : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al añadir miembro");
    }
  }

  async function handleRemoveMember(familyId: string, userId: string) {
    await removeFamilyMemberAction(familyId, userId);
    setFamilies((prev) =>
      prev.map((f) =>
        f.id === familyId ? { ...f, members: f.members.filter((m) => m.user_id !== userId) } : f
      )
    );
  }

  const assignedUserIds = new Set(families.flatMap((f) => f.members.map((m) => m.user_id)));

  return (
    <div className={styles.container}>
      <h1>Familias</h1>

      <div className={styles.newFamilyRow}>
        <input
          value={newFamilyName}
          onChange={(e) => setNewFamilyName(e.target.value)}
          placeholder="Nombre de la familia"
        />
        <button onClick={handleCreateFamily}>Crear familia</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {families.map((family) => (
        <div key={family.id} className={styles.familyCard}>
          <h2>{family.name}</h2>
          <ul>
            {family.members.map((m) => (
              <li key={m.user_id}>
                {m.name} ({m.email}){" "}
                <button onClick={() => handleRemoveMember(family.id, m.user_id)}>Quitar</button>
              </li>
            ))}
          </ul>
          <div className={styles.addMemberRow}>
            <select
              value={selectedUserByFamily[family.id] ?? ""}
              onChange={(e) =>
                setSelectedUserByFamily({ ...selectedUserByFamily, [family.id]: e.target.value })
              }
            >
              <option value="">Elegir usuario…</option>
              {allUsers
                .filter((u) => !assignedUserIds.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
            <button onClick={() => handleAddMember(family.id)}>Añadir</button>
          </div>
        </div>
      ))}
    </div>
  );
}
