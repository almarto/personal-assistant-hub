import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteItem, getItem } from "@/lib/services/inventory";

export async function GET(
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
    const item = await getItem(params.id, session.user.id);
    
    if (!item) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    await deleteItem(params.id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
