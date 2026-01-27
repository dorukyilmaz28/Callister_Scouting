import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const isScout = session.role === "scout";
    if (isScout && !teamId) {
      const assignments = await prisma.scoutAssignment.findMany({
        where: { eventId, userId: session.id },
        select: { teamId: true },
      });
      const teamIds = assignments.map((a) => a.teamId);
      const pitScouts = await prisma.pitScout.findMany({
        where: { eventId, teamId: { in: teamIds } },
        include: { team: true, user: true },
      });
      return NextResponse.json(pitScouts);
    }
    const where: { eventId: string; teamId?: string } = { eventId };
    if (teamId) where.teamId = teamId;
    if (isScout) {
      const assignments = await prisma.scoutAssignment.findMany({
        where: { eventId, userId: session.id },
        select: { teamId: true },
      });
      const allowedTeamIds = assignments.map((a) => a.teamId);
      where.teamId = teamId && allowedTeamIds.includes(teamId) ? teamId : undefined;
      if (!teamId) {
        const pitScouts = await prisma.pitScout.findMany({
          where: { eventId, teamId: { in: allowedTeamIds } },
          include: { team: true, user: true },
        });
        return NextResponse.json(pitScouts);
      }
      if (!allowedTeamIds.includes(teamId)) {
        return NextResponse.json({ error: "Not assigned to this team" }, { status: 403 });
      }
    }
    const pitScouts = await prisma.pitScout.findMany({
      where,
      include: { team: true, user: true },
    });
    return NextResponse.json(pitScouts);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const session = await getSession();
    if (!session) throw new Error("no session");
    const body = await request.json();
    const {
      eventId,
      teamId,
      drivetrainType,
      robotType,
      intakeType,
      shooterType,
      climbCapability,
      teamToldUs,
      scoutObservations,
    } = body;
    if (!eventId || !teamId || !drivetrainType || !robotType) {
      return NextResponse.json(
        { error: "eventId, teamId, drivetrainType, robotType required" },
        { status: 400 }
      );
    }
    if (session.role === "scout") {
      const assigned = await prisma.scoutAssignment.findFirst({
        where: { eventId, userId: session.id, teamId },
      });
      if (!assigned) {
        return NextResponse.json({ error: "Not assigned to this team" }, { status: 403 });
      }
    }
    const pit = await prisma.pitScout.upsert({
      where: {
        eventId_teamId: { eventId, teamId },
      },
      create: {
        eventId,
        teamId,
        userId: session.id,
        drivetrainType,
        robotType,
        intakeType: intakeType ?? null,
        shooterType: shooterType ?? null,
        climbCapability: climbCapability ?? null,
        teamToldUs: teamToldUs ?? null,
        scoutObservations: scoutObservations ?? null,
      },
      update: {
        drivetrainType,
        robotType,
        intakeType: intakeType ?? null,
        shooterType: shooterType ?? null,
        climbCapability: climbCapability ?? null,
        teamToldUs: teamToldUs ?? null,
        scoutObservations: scoutObservations ?? null,
      },
      include: { team: true },
    });
    return NextResponse.json(pit);
  } catch (e) {
    return NextResponse.json({ error: "Pit scout save failed" }, { status: 500 });
  }
}
