import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "strategy"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      eventTeams: { include: { team: true } },
      matchScouts: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teamIds = event.eventTeams.map((et) => et.teamId);
  const summary = teamIds.map((tid) => {
    const team = event.eventTeams.find((et) => et.teamId === tid)?.team;
    if (!team) return null;
    const matchScouts = event.matchScouts.filter((m) => m.teamId === tid);
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
    return {
      teamNumber: team.number,
      avgAutoScore: avgAutoScore != null ? Math.round(avgAutoScore * 100) / 100 : null,
      climbSuccessRate: climbSuccessRate != null ? Math.round(climbSuccessRate * 100) / 100 : null,
      matchCount: matchScouts.length,
    };
  }).filter(Boolean) as { teamNumber: number; avgAutoScore: number | null; climbSuccessRate: number | null; matchCount: number }[];

  return NextResponse.json(summary);
}
