import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

type TeamMetric = {
  teamId: string;
  teamNumber: number;
  teamName: string | null;
  matchCount: number;
  autoAvg: number;
  teleopAvg: number;
  climbRate: number;
  driverAvg: number | null;
};

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
      select: { teamId: true },
    });
    const assignedTeamIds = assignments.map((a) => a.teamId);

    const teamWhere =
      session.role === "scout" && assignedTeamIds.length > 0
        ? { eventId, teamId: { in: assignedTeamIds } }
        : session.role === "scout"
          ? { eventId, teamId: "__none__" }
          : { eventId };

    const eventTeams = await prisma.eventTeam.findMany({
      where: teamWhere,
      include: { team: true },
      orderBy: { team: { number: "asc" } },
    });
    if (eventTeams.length === 0) return NextResponse.json({ teams: [] });

    const metrics = await Promise.all(
      eventTeams.map(async (et): Promise<TeamMetric> => {
        const matchScouts = await prisma.matchScout.findMany({
          where: { eventId, teamId: et.teamId },
          select: {
            autoScoreCount: true,
            gamePieceCount: true,
            climbAttempted: true,
            climbSuccess: true,
            driverSkill: true,
          },
        });

        const matchCount = matchScouts.length;
        const autoAvg =
          matchCount > 0
            ? Number(
                (
                  matchScouts.reduce((s, m) => s + (m.autoScoreCount ?? 0), 0) / matchCount
                ).toFixed(2)
              )
            : 0;
        const teleopAvg =
          matchCount > 0
            ? Number(
                (
                  matchScouts.reduce((s, m) => s + (m.gamePieceCount ?? 0), 0) / matchCount
                ).toFixed(2)
              )
            : 0;
        const climbAttempts = matchScouts.filter((m) => m.climbAttempted).length;
        const climbSuccess = matchScouts.filter((m) => m.climbAttempted && m.climbSuccess).length;
        const climbRate =
          climbAttempts > 0 ? Number(((climbSuccess / climbAttempts) * 100).toFixed(1)) : 0;
        const driverRows = matchScouts.filter((m) => m.driverSkill != null);
        const driverAvg =
          driverRows.length > 0
            ? Number(
                (
                  driverRows.reduce((s, m) => s + (m.driverSkill ?? 0), 0) / driverRows.length
                ).toFixed(2)
              )
            : null;

        return {
          teamId: et.teamId,
          teamNumber: et.team.number,
          teamName: et.team.name,
          matchCount,
          autoAvg,
          teleopAvg,
          climbRate,
          driverAvg,
        };
      })
    );

    return NextResponse.json({ teams: metrics });
  } catch (e) {
    console.error("[teams/compare]", e);
    return NextResponse.json({ error: "Compare failed" }, { status: 500 });
  }
}
