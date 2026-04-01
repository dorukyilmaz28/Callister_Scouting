import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Canlı Skor sayfasında FRC verisi yokken scout girişlerini göstermek için. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: eventId } = await params;

    const matchScouts = await prisma.matchScout.findMany({
      where:
        session.role === "scout"
          ? { eventId, userId: session.id }
          : { eventId },
      include: {
        match: true,
        team: true,
      },
      orderBy: [{ match: { matchNumber: "asc" } }, { match: { matchType: "asc" } }],
    });

    const byMatch = new Map<string, { matchNumber: number; matchType: string; entries: Array<{
      teamNumber: number;
      teamName: string | null;
      autoScoreCount: number;
      gamePieceCount: number;
      climbSuccess: boolean;
    }> }>();

    for (const ms of matchScouts) {
      const key = `${ms.match.matchNumber}-${ms.match.matchType}`;
      if (!byMatch.has(key)) {
        byMatch.set(key, {
          matchNumber: ms.match.matchNumber,
          matchType: ms.match.matchType,
          entries: [],
        });
      }
      byMatch.get(key)!.entries.push({
        teamNumber: ms.team.number,
        teamName: ms.team.name ?? null,
        autoScoreCount: ms.autoScoreCount,
        gamePieceCount: ms.gamePieceCount,
        climbSuccess: ms.climbSuccess,
      });
    }

    const matches = Array.from(byMatch.values()).sort(
      (a, b) => a.matchNumber - b.matchNumber || a.matchType.localeCompare(b.matchType)
    );

    return NextResponse.json({ matches });
  } catch (e) {
    console.error("[scout-match-list]", e);
    return NextResponse.json({ error: "Veri alınamadı" }, { status: 500 });
  }
}
