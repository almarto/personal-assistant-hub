import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteLocation } from "@/lib/services/inventory";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await props.params;
    await deleteLocation(params.id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
