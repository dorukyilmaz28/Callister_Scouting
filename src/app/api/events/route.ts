import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: {
      eventTeams: { include: { team: true } },
      _count: { select: { matches: true } },
    },
  });
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
  } catch (e) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { name, code, startDate, endDate, teamNumbers } = body;
    if (!name || !code || !startDate || !endDate) {
      return NextResponse.json(
        { error: "name, code, startDate, endDate required" },
        { status: 400 }
      );
    }
    const event = await prisma.event.create({
      data: {
        name,
        code,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    if (Array.isArray(teamNumbers) && teamNumbers.length > 0) {
      const teams = await prisma.team.findMany({
        where: { number: { in: teamNumbers } },
      });
      const missing = teamNumbers.filter(
        (n: number) => !teams.some((t) => t.number === n)
      );
      for (const num of missing) {
        await prisma.team.upsert({
          where: { number: num },
          create: { number: num },
          update: {},
        });
      }
      const allTeams = await prisma.team.findMany({
        where: { number: { in: teamNumbers } },
      });
      await prisma.eventTeam.createMany({
        data: allTeams.map((t) => ({ eventId: event.id, teamId: t.id })),
        skipDuplicates: true,
      });
    }
    const withTeams = await prisma.event.findUnique({
      where: { id: event.id },
      include: { eventTeams: { include: { team: true } } },
    });
    return NextResponse.json(withTeams ?? event);
  } catch (e) {
    return NextResponse.json({ error: "Create event failed" }, { status: 500 });
  }
}
