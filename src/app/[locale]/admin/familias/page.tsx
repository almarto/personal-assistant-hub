import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getFamilyWithMembers, listFamilies } from "@/lib/services/wellness/families";

import FamiliasClient from "./FamiliasClient";

export default async function AdminFamiliasPage() {
  const sessionHeaders = await headers();
  const usersData = await auth.api.listUsers({
    headers: sessionHeaders,
    query: { limit: 100 },
  });
  const allUsers = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  const familiesRaw = await listFamilies();
  const families = await Promise.all(
    familiesRaw.map(async (f) => {
      const withMembers = await getFamilyWithMembers(f.id);
      return { id: f.id, name: f.name, members: withMembers?.members ?? [] };
    })
  );

  return <FamiliasClient initialFamilies={families} allUsers={allUsers} />;
}
