import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createItem, getItems } from "@/lib/services/inventory";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || undefined;
  const search = searchParams.get("search") || undefined;
  const tag = searchParams.get("tag") || undefined;

  try {
    const items = await getItems(session.user.id, { locationId, search, tag });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
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
    const { name, description, tags, locationId, purchaseDate, warrantyExpiryDate } = body;

    if (!name || !locationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newItem = await createItem({
      userId: session.user.id,
      locationId,
      name,
      description,
      tags: tags || [],
      purchaseDate,
      warrantyExpiryDate,
    });

    return NextResponse.json(newItem);
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
