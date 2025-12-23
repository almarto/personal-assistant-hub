import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

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

    // Check permissions
    const permCheck = await pool.query(
      `SELECT 1 FROM babies WHERE id = $1 AND user_id = $2
       UNION
       SELECT 1 FROM caregivers WHERE baby_id = $1 AND user_id = $2 AND permission_level = 'editor'`,
      [babyId, session.user.id]
    );

    if (permCheck.rowCount === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO food_entries (baby_id, user_id, food_name, category, feedback_score, reaction_score, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [babyId, session.user.id, foodName, category, feedback, reaction, notes]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
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
    // Check view permissions
    const permCheck = await pool.query(
      `SELECT 1 FROM babies WHERE id = $1 AND user_id = $2
       UNION
       SELECT 1 FROM caregivers WHERE baby_id = $1 AND user_id = $2`,
      [babyId, session.user.id]
    );

    if (permCheck.rowCount === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT * FROM food_entries WHERE baby_id = $1 ORDER BY created_at DESC`,
      [babyId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching food entries:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
