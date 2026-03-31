import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.id;
    if (!userId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { id: eventId } = await params;
    if (!eventId) return NextResponse.json({ error: "Event id required" }, { status: 400 });

    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId },
      include: { team: true },
    });

    const teams = await Promise.all(
      assignments.map(async (a) => {
        const pit = await prisma.pitScout.findUnique({
          where: { eventId_teamId_userId: { eventId, teamId: a.teamId, userId } },
        });
        const matchCount = await prisma.matchScout.count({
          where: { eventId, teamId: a.teamId },
        });
        return {
          teamId: a.teamId,
          teamNumber: a.team.number,
          teamName: a.team.name ?? null,
          pitDone: !!pit,
          matchCount,
        };
      })
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true, tbaEventKey: true },
    });

    return NextResponse.json({
      user: session,
      teams,
      eventName: event?.name ?? null,
      eventTbaEventKey: event?.tbaEventKey ?? null,
    });
  } catch (e) {
    console.error("[dashboard]", e);
    const message = e instanceof Error ? e.message : "Failed";
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { error: "Failed", ...(isDev && { detail: message }) },
      { status: 500 }
    );
  }
}
