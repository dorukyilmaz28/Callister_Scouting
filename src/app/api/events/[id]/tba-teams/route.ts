import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const key = process.env.TBA_API_KEY;
    if (!key) return NextResponse.json({ error: "TBA API key yok" }, { status: 500 });

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { tbaEventKey: true },
    });
    if (!event?.tbaEventKey) {
      return NextResponse.json([]);
    }

    const res = await fetch(
      `${TBA_BASE}/event/${encodeURIComponent(event.tbaEventKey)}/teams`,
      { headers: { "X-TBA-Auth-Key": key } }
    );
    if (!res.ok) return NextResponse.json([]);
    const tbaTeams = (await res.json()) as { team_number: number; nickname?: string }[];
    return NextResponse.json(
      tbaTeams.map((t) => ({ team_number: t.team_number, nickname: t.nickname ?? null }))
    );
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
