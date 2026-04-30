import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createLocation, getLocations } from "@/lib/services/inventory";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parentIdParam = searchParams.get("parentId");
  
  // Custom logic: if parentId=null, fetch top level locations.
  // If undefined, fetch all.
  let parentId: string | undefined | null = undefined;
  if (parentIdParam === "null") {
     parentId = null;
  } else if (parentIdParam) {
     parentId = parentIdParam;
  }

  try {
    const locations = await getLocations(session.user.id, parentId);
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, type, parentId } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newLocation = await createLocation({
      userId: session.user.id,
      name,
      type,
      parentId,
    });

    return NextResponse.json(newLocation);
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
