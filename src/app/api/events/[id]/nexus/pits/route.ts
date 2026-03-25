import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildNexusEventKey } from "@/lib/frc-api";
import { getNexusPitAddresses, getNexusPitMap } from "@/lib/nexus-api";

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
      orderBy: { team: { number: "asc" } },
    });
    if (assignments.length === 0)
      return NextResponse.json({ eventKey: null, pits: [], pitMap: null });

    const eventKey = buildNexusEventKey(event.tbaEventKey ?? event.code);
    if (!eventKey) return NextResponse.json({ eventKey: null, pits: [], pitMap: null });

    const [pits, pitMap] = await Promise.all([
      getNexusPitAddresses(eventKey),
      getNexusPitMap(eventKey),
    ]);

    const rows = assignments.map((a) => ({
      teamNumber: a.team.number,
      teamName: a.team.name ?? null,
      pitAddress: pits
        ? (pits[String(a.team.number)] ?? pits[`frc${a.team.number}`] ?? null)
        : null,
    }));
    return NextResponse.json({ eventKey, pits: rows, pitMap: pitMap ?? null });
  } catch (error) {
    console.error("[events/:id/nexus/pits]", error);
    return NextResponse.json({ error: "Failed to fetch Nexus pits" }, { status: 500 });
  }
}

