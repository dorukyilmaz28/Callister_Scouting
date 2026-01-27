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
    const { id: eventId } = await params;

    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId: session.id },
      include: { team: true },
    });

    const teams = await Promise.all(
      assignments.map(async (a) => {
        const pit = await prisma.pitScout.findUnique({
          where: { eventId_teamId: { eventId, teamId: a.teamId } },
        });
        const matchCount = await prisma.matchScout.count({
          where: { eventId, teamId: a.teamId },
        });
        return {
          teamId: a.teamId,
          teamNumber: a.team.number,
          pitDone: !!pit,
          matchCount,
        };
      })
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true },
    });

    return NextResponse.json({ user: session, teams, eventName: event?.name ?? null });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
