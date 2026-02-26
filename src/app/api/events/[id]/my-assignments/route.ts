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
    const teamIds = body?.teamIds as string[] | undefined;
    const teamNumbers = body?.teamNumbers as number[] | undefined;

    let validTeamIds: string[];

    if (Array.isArray(teamNumbers) && teamNumbers.length > 0) {
      if (teamNumbers.length > MAX_TEAMS_PER_SCOUT) {
        return NextResponse.json(
          { error: `En fazla ${MAX_TEAMS_PER_SCOUT} takım seçebilirsiniz` },
          { status: 400 }
        );
      }
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });
      validTeamIds = [];
      for (const num of teamNumbers) {
        const team = await prisma.team.upsert({
          where: { number: num },
          create: { number: num },
          update: {},
        });
        await prisma.eventTeam.upsert({
          where: { eventId_teamId: { eventId, teamId: team.id } },
          create: { eventId, teamId: team.id },
          update: {},
        });
        validTeamIds.push(team.id);
      }
    } else if (Array.isArray(teamIds) && teamIds.length > 0) {
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
      validTeamIds = event.eventTeams
        .filter((et) => teamIds.includes(et.teamId))
        .map((et) => et.teamId);
      if (validTeamIds.length !== teamIds.length) {
        return NextResponse.json(
          { error: "Seçilen takımlar bu etkinlikte olmalı" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "teamIds veya teamNumbers (array) gerekli" },
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
