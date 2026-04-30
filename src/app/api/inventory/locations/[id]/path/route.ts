import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getLocationPath } from "@/lib/services/inventory";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const path = await getLocationPath(id);
    return NextResponse.json(path);
  } catch (error) {
    console.error("Error fetching location path:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
