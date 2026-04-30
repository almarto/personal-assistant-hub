import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { addItemImage, getItem } from "@/lib/services/inventory";

export async function POST(
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
    const itemId = params.id;

    // Verify ownership
    const item = await getItem(itemId, session.user.id);
    if (!item) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Keep it reasonable (<5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const { url } = await put(`inventory/${itemId}/${file.name}`, file, {
      access: "public",
    });

    const newImage = await addItemImage(itemId, url);

    return NextResponse.json(newImage);
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
