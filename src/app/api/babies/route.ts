import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const birthDate = formData.get('birthDate') as string;
    // const photo = formData.get('photo') as File | null;
    
    if (!name || !birthDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // TODO: Handle photo upload if needed
    const photoUrl = null;

    const result = await pool.query(
      `INSERT INTO babies (user_id, name, birth_date, photo_url) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, birth_date, photo_url`,
      [session.user.id, name, birthDate, photoUrl]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating baby:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get babies where user is primary or caregiver
    const result = await pool.query(
      `SELECT b.*, 
        CASE WHEN b.user_id = $1 THEN 'owner' ELSE c.permission_level END as role
       FROM babies b
       LEFT JOIN caregivers c ON b.id = c.baby_id AND c.user_id = $1
       WHERE b.user_id = $1 OR c.user_id = $1
       ORDER BY b.created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching babies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
