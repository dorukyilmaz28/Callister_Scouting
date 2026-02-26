import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

export async function POST(
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
      include: { eventTeams: { include: { team: true } } },
    });
    if (!event) return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });
    const eventKey = event.tbaEventKey;
    if (!eventKey) {
      return NextResponse.json(
        { error: "Bu etkinlik TBA'dan eklenmedi; takım listesi TBA'dan yüklenemez." },
        { status: 400 }
      );
    }

    const teamsRes = await fetch(
      `${TBA_BASE}/event/${encodeURIComponent(eventKey)}/teams`,
      { headers: { "X-TBA-Auth-Key": key } }
    );
    if (!teamsRes.ok) {
      return NextResponse.json(
        { error: "TBA takım listesi alınamadı" },
        { status: teamsRes.status }
      );
    }
    const tbaTeams = (await teamsRes.json()) as { team_number: number; nickname?: string }[];
    const teamNumbers = tbaTeams.map((t) => t.team_number);
    if (teamNumbers.length === 0) {
      return NextResponse.json(
        { error: "TBA'da bu etkinlik için takım bulunamadı." },
        { status: 400 }
      );
    }

    for (let i = 0; i < tbaTeams.length; i++) {
      const t = tbaTeams[i];
      await prisma.team.upsert({
        where: { number: t.team_number },
        create: { number: t.team_number, name: t.nickname ?? null },
        update: { name: t.nickname ?? undefined },
      });
    }

    const teams = await prisma.team.findMany({
      where: { number: { in: teamNumbers } },
    });
    await prisma.eventTeam.createMany({
      data: teams.map((t) => ({ eventId, teamId: t.id })),
      skipDuplicates: true,
    });

    const updated = await prisma.event.findUnique({
      where: { id: eventId },
      include: { eventTeams: { include: { team: true } } },
    });
    return NextResponse.json(updated ?? event);
  } catch (e) {
    console.error("[sync-teams-from-tba]", e);
    return NextResponse.json({ error: "TBA senkronizasyonu başarısız" }, { status: 500 });
  }
}
