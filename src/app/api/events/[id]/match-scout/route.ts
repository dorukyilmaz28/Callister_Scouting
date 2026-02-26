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
    const matchNumber = searchParams.get("matchNumber");
    const teamNumber = searchParams.get("teamNumber");
    const matchType = searchParams.get("matchType") || "qual";
    if (!matchNumber || !teamNumber) {
      return NextResponse.json(
        { error: "matchNumber ve teamNumber gerekli" },
        { status: 400 }
      );
    }
    const mn = parseInt(matchNumber, 10);
    const tn = parseInt(teamNumber, 10);
    if (Number.isNaN(mn) || Number.isNaN(tn)) {
      return NextResponse.json({ error: "Geçersiz numara" }, { status: 400 });
    }
    const match = await prisma.match.findFirst({
      where: { eventId, matchNumber: mn, matchType },
    });
    const team = await prisma.team.findUnique({ where: { number: tn } });
    if (!match || !team) {
      return NextResponse.json(null);
    }
    const scout = await prisma.matchScout.findUnique({
      where: { matchId_teamId: { matchId: match.id, teamId: team.id } },
      include: { team: true, match: true },
    });
    return NextResponse.json(scout);
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
      matchNumber,
      teamNumber,
      matchType = "qual",
      autoAttempted,
      autoScoreCount,
      autoDescription,
      autoConsistency,
      gamePieceCount,
      cycleSpeed,
      defensePlayed,
      climbAttempted,
      climbSuccess,
      climbType,
      requestedStrategy,
      driverSkill,
      scoutComments,
      autonomousRouteWaypoints,
    } = body;
    if (!eventId || matchNumber == null || teamNumber == null) {
      return NextResponse.json(
        { error: "eventId, matchNumber ve teamNumber gerekli" },
        { status: 400 }
      );
    }
    const mn = Number(matchNumber);
    const tn = Number(teamNumber);
    if (Number.isNaN(mn) || Number.isNaN(tn)) {
      return NextResponse.json({ error: "Geçersiz maç veya takım numarası" }, { status: 400 });
    }
    const mt = matchType === "playoff" ? "playoff" : "qual";

    let match = await prisma.match.findFirst({
      where: { eventId, matchNumber: mn, matchType: mt },
    });
    if (!match) {
      match = await prisma.match.create({
        data: { eventId, matchNumber: mn, matchType: mt },
      });
    }

    const team = await prisma.team.upsert({
      where: { number: tn },
      create: { number: tn },
      update: {},
    });

    if (session.role === "scout") {
      const assigned = await prisma.scoutAssignment.findFirst({
        where: { eventId, userId: session.id, teamId: team.id },
      });
      if (!assigned) {
        return NextResponse.json(
          { error: "Bu takım size atanmadı. Sadece seçtiğiniz takımlar için maç girişi yapabilirsiniz." },
          { status: 403 }
        );
      }
    }

    await prisma.eventTeam.upsert({
      where: { eventId_teamId: { eventId, teamId: team.id } },
      create: { eventId, teamId: team.id },
      update: {},
    });

    const scout = await prisma.matchScout.upsert({
      where: { matchId_teamId: { matchId: match.id, teamId: team.id } },
      create: {
        eventId,
        matchId: match.id,
        teamId: team.id,
        userId: session.id,
        autoAttempted: !!autoAttempted,
        autoScoreCount: Number(autoScoreCount) ?? 0,
        autoDescription: autoDescription ?? null,
        autoConsistency: autoConsistency != null ? Number(autoConsistency) : null,
        gamePieceCount: Number(gamePieceCount) ?? 0,
        cycleSpeed: cycleSpeed ?? null,
        defensePlayed: !!defensePlayed,
        climbAttempted: !!climbAttempted,
        climbSuccess: !!climbSuccess,
        climbType: climbType ?? null,
        requestedStrategy: requestedStrategy ?? null,
        driverSkill: driverSkill != null ? Number(driverSkill) : null,
        scoutComments: scoutComments ?? null,
        autonomousRouteWaypoints: Array.isArray(autonomousRouteWaypoints) ? autonomousRouteWaypoints : null,
      },
      update: {
        autoAttempted: !!autoAttempted,
        autoScoreCount: Number(autoScoreCount) ?? 0,
        autoDescription: autoDescription ?? null,
        autoConsistency: autoConsistency != null ? Number(autoConsistency) : null,
        gamePieceCount: Number(gamePieceCount) ?? 0,
        cycleSpeed: cycleSpeed ?? null,
        defensePlayed: !!defensePlayed,
        climbAttempted: !!climbAttempted,
        climbSuccess: !!climbSuccess,
        climbType: climbType ?? null,
        requestedStrategy: requestedStrategy ?? null,
        driverSkill: driverSkill != null ? Number(driverSkill) : null,
        scoutComments: scoutComments ?? null,
        autonomousRouteWaypoints: Array.isArray(autonomousRouteWaypoints) ? autonomousRouteWaypoints : null,
      },
      include: { team: true, match: true },
    });
    return NextResponse.json(scout);
  } catch (e) {
    return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
  }
}
