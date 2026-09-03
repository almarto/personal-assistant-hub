import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveParticipantByToken } from "@/lib/services/trips";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let participant;
  try {
    participant = await resolveParticipantByToken(token);
  } catch {
    return NextResponse.redirect(new URL("/es", req.url));
  }

  const tripPath = `/trips/${participant.trip_id}`;

  if (participant.user_id) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.id === participant.user_id) {
      return NextResponse.redirect(new URL(`/es${tripPath}`, req.url));
    }
    return NextResponse.redirect(
      new URL(`/es/auth/signin?callbackUrl=${encodeURIComponent(tripPath)}`, req.url)
    );
  }

  const response = NextResponse.redirect(new URL(`/es${tripPath}`, req.url));
  response.cookies.set(`tp_guest_${participant.trip_id}`, participant.invite_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
