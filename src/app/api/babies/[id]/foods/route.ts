import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { addFoodEntry, getFoodEntries } from "@/lib/services/foods";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: babyId } = await params;

  try {
    const formData = await req.formData();
    const foodName = formData.get("foodName") as string;
    const category = formData.get("category") as string;
    const feedback = Number(formData.get("feedback"));
    const reaction = Number(formData.get("reaction"));
    const notes = formData.get("notes") as string | null;

    if (!foodName || !category || isNaN(feedback) || isNaN(reaction)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newFoodEntry = await addFoodEntry({
      babyId,
      userId: session.user.id,
      foodName,
      category,
      feedbackScore: feedback,
      reactionScore: reaction,
      notes,
    });

    return NextResponse.json(newFoodEntry);
  } catch (error: any) {
    if (error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error adding food entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

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

  const { id: babyId } = await params;

  try {
    const foods = await getFoodEntries(babyId, session.user.id);
    return NextResponse.json(foods);
  } catch (error: any) {
    if (error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error fetching food entries:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
