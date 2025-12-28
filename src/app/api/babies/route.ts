import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getBabies, createBaby } from "@/lib/services/babies";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const birthDate = formData.get("birthDate") as string;
    // const photo = formData.get('photo') as File | null;

    if (!name || !birthDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Handle photo upload if needed
    const photoUrl = null;

    const newBaby = await createBaby({
      userId: session.user.id,
      name,
      birthDate,
      photoUrl,
    });

    return NextResponse.json(newBaby);
  } catch (error) {
    console.error("Error creating baby:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const babies = await getBabies(session.user.id);
    return NextResponse.json(babies);
  } catch (error) {
    console.error("Error fetching babies:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
