import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildNexusEventKey } from "@/lib/frc-api";
import { getNexusLiveEventStatus } from "@/lib/nexus-api";

function normalizeTeamNumber(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, code: true, tbaEventKey: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId: session.id },
      select: { team: { select: { number: true, name: true } } },
    });
    const selectedTeamNumbers = assignments.map((a) => a.team.number);
    if (selectedTeamNumbers.length === 0) {
      return NextResponse.json({ eventKey: null, selectedTeams: [], nowQueuing: null, matches: [] });
    }

    const eventKey = buildNexusEventKey(event.tbaEventKey ?? event.code);
    if (!eventKey) {
      return NextResponse.json({
        eventKey: null,
        selectedTeams: selectedTeamNumbers,
        nowQueuing: null,
        matches: [],
      });
    }

    const live = await getNexusLiveEventStatus(eventKey);
    if (!live) {
      return NextResponse.json({
        eventKey,
        selectedTeams: selectedTeamNumbers,
        nowQueuing: null,
        matches: [],
      });
    }

    const filtered = (live.matches ?? []).filter((m) => {
      const red = (m.redTeams ?? []).map((t) => normalizeTeamNumber(t)).filter(Boolean) as number[];
      const blue = (m.blueTeams ?? []).map((t) => normalizeTeamNumber(t)).filter(Boolean) as number[];
      return [...red, ...blue].some((n) => selectedTeamNumbers.includes(n));
    });

    return NextResponse.json({
      eventKey,
      dataAsOfTime: live.dataAsOfTime ?? null,
      selectedTeams: selectedTeamNumbers,
      nowQueuing: live.nowQueuing ?? null,
      matches: filtered,
    });
  } catch (error) {
    console.error("[events/:id/nexus/live]", error);
    return NextResponse.json({ error: "Failed to fetch Nexus live data" }, { status: 500 });
  }
}

