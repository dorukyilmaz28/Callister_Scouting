import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "strategy"]);
    const { id: eventId } = await params;

    const members = await prisma.user.findMany({
      where: { role: "scout" },
      select: { id: true, fullName: true, name: true, email: true, teamNumber: true },
      orderBy: { fullName: "asc" },
    });

    const stats = await Promise.all(
      members.map(async (m) => {
        const [pitCount, matchCount, assignments, recentMatchScouts, recentPitScouts] =
          await Promise.all([
            prisma.pitScout.count({ where: { eventId, userId: m.id } }),
            prisma.matchScout.count({ where: { eventId, userId: m.id } }),
            prisma.scoutAssignment.findMany({
              where: { eventId, userId: m.id },
              include: { team: true },
            }),
            prisma.matchScout.findMany({
              where: { eventId, userId: m.id },
              include: { team: true, match: true },
              orderBy: { updatedAt: "desc" },
              take: 3,
            }),
            prisma.pitScout.findMany({
              where: { eventId, userId: m.id },
              include: { team: true },
              orderBy: { updatedAt: "desc" },
              take: 2,
            }),
          ]);

        return {
          userId: m.id,
          userName: m.fullName ?? m.name ?? m.email ?? m.id,
          teamNumber: m.teamNumber,
          pitCount,
          matchCount,
          assignedTeams: assignments.map((a) => ({
            teamId: a.teamId,
            teamNumber: a.team.number,
            teamName: a.team.name,
          })),
          recentMatchScouts: recentMatchScouts.map((x) => ({
            teamNumber: x.team.number,
            matchNumber: x.match.matchNumber,
            matchType: x.match.matchType,
            autoScoreCount: x.autoScoreCount,
            gamePieceCount: x.gamePieceCount,
            climbSuccess: x.climbSuccess,
          })),
          recentPitScouts: recentPitScouts.map((x) => ({
            teamNumber: x.team.number,
            drivetrainType: x.drivetrainType,
            robotType: x.robotType,
            climbCapability: x.climbCapability,
          })),
        };
      })
    );

    return NextResponse.json({ members: stats });
  } catch (e) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
