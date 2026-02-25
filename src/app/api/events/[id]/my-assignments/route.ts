import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MAX_TEAMS_PER_SCOUT = 2;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: eventId } = await params;
    const body = await request.json();
    const teamIds = body?.teamIds;
    if (!Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: "teamIds (array) gerekli" },
        { status: 400 }
      );
    }
    if (teamIds.length > MAX_TEAMS_PER_SCOUT) {
      return NextResponse.json(
        { error: `En fazla ${MAX_TEAMS_PER_SCOUT} takım seçebilirsiniz` },
        { status: 400 }
      );
    }
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { eventTeams: true },
    });
    if (!event) return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });
    const validTeamIds = event.eventTeams
      .filter((et) => teamIds.includes(et.teamId))
      .map((et) => et.teamId);
    if (teamIds.length !== validTeamIds.length) {
      return NextResponse.json(
        { error: "Seçilen takımlar bu etkinlikte olmalı" },
        { status: 400 }
      );
    }
    await prisma.scoutAssignment.deleteMany({
      where: { eventId, userId: session.id },
    });
    if (validTeamIds.length > 0) {
      await prisma.scoutAssignment.createMany({
        data: validTeamIds.map((teamId) => ({
          eventId,
          userId: session.id,
          teamId,
        })),
      });
    }
    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId: session.id },
      include: { team: true },
    });
    return NextResponse.json(assignments);
  } catch (e) {
    return NextResponse.json({ error: "Atama güncellenemedi" }, { status: 500 });
  }
}
