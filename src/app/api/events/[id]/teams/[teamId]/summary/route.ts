import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: eventId, teamId } = await params;
    if (session.role === "scout") {
      const assigned = await prisma.scoutAssignment.findFirst({
        where: { eventId, userId: session.id, teamId },
      });
      if (!assigned) {
        return NextResponse.json({ error: "Not assigned to this team" }, { status: 403 });
      }
    }
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        pitScouts: { where: { eventId }, take: 1, orderBy: { updatedAt: "desc" } },
      },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    const matchScouts = await prisma.matchScout.findMany({
      where: { eventId, teamId },
      include: { match: true },
    });
    const pit = team.pitScouts[0] ?? null;
    const withAuto = matchScouts.filter((m) => m.autoAttempted);
    const avgAutoScore =
      withAuto.length > 0
        ? withAuto.reduce((s, m) => s + m.autoScoreCount, 0) / withAuto.length
        : null;
    const withClimb = matchScouts.filter((m) => m.climbAttempted);
    const climbSuccessRate =
      withClimb.length > 0
        ? withClimb.filter((m) => m.climbSuccess).length / withClimb.length
        : null;
    const avgDriverSkill =
      matchScouts.filter((m) => m.driverSkill != null).length > 0
        ? (matchScouts.reduce((s, m) => s + (m.driverSkill ?? 0), 0) /
            matchScouts.filter((m) => m.driverSkill != null).length)
        : null;
    const avgConsistency =
      matchScouts.filter((m) => m.autoConsistency != null).length > 0
        ? (matchScouts.reduce((s, m) => s + (m.autoConsistency ?? 0), 0) /
            matchScouts.filter((m) => m.autoConsistency != null).length)
        : null;

    return NextResponse.json({
      team: { id: team.id, number: team.number, name: team.name },
      pit,
      matchScouts,
      summary: {
        matchCount: matchScouts.length,
        avgAutoScore: avgAutoScore != null ? Math.round(avgAutoScore * 100) / 100 : null,
        climbSuccessRate: climbSuccessRate != null ? Math.round(climbSuccessRate * 100) / 100 : null,
        avgDriverSkill: avgDriverSkill != null ? Math.round(avgDriverSkill * 100) / 100 : null,
        avgConsistency: avgConsistency != null ? Math.round(avgConsistency * 100) / 100 : null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
