import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildFrcUrl, getFrcAuthHeader, getSeasonAndEventCode } from "@/lib/frc-api";

type FrcScoreRow = {
  matchNumber?: number;
  redScore?: number;
  blueScore?: number;
  redAuto?: number;
  blueAuto?: number;
  redTeleop?: number;
  blueTeleop?: number;
  redEndgame?: number;
  blueEndgame?: number;
};

function pickNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function parseFrcScoreRows(data: unknown): FrcScoreRow[] {
  if (!data || typeof data !== "object") return [];
  const container = data as Record<string, unknown>;
  const arr =
    container.MatchScores ??
    container.matchScores ??
    container.matches ??
    container.Matches ??
    container.MatchResults ??
    container.matchResults;
  if (!Array.isArray(arr)) return [];

  return arr
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((row) => ({
      matchNumber: pickNumber(row, ["matchNumber", "MatchNumber"]) ?? undefined,
      redScore: pickNumber(row, ["redScore", "scoreRedFinal", "scoreRed"]),
      blueScore: pickNumber(row, ["blueScore", "scoreBlueFinal", "scoreBlue"]),
      redAuto: pickNumber(row, ["redAuto", "scoreRedAuto"]),
      blueAuto: pickNumber(row, ["blueAuto", "scoreBlueAuto"]),
      redTeleop: pickNumber(row, ["redTeleop", "scoreRedTeleop"]),
      blueTeleop: pickNumber(row, ["blueTeleop", "scoreBlueTeleop"]),
      redEndgame: pickNumber(row, ["redEndgame", "scoreRedEndgame"]),
      blueEndgame: pickNumber(row, ["blueEndgame", "scoreBlueEndgame"]),
    }))
    .filter((x) => typeof x.matchNumber === "number");
}

function parseScheduleRows(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const container = data as Record<string, unknown>;
  const arr = container.Schedule ?? container.schedule;
  return Array.isArray(arr)
    ? arr.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];
}

function teamAllianceForMatch(
  scheduleRows: Array<Record<string, unknown>>,
  teamNumber: number,
  matchNumber: number
): "red" | "blue" | null {
  const row = scheduleRows.find((r) => pickNumber(r, ["matchNumber", "MatchNumber"]) === matchNumber);
  if (!row) return null;
  const redKeys = ["red1", "red2", "red3", "teamNumberRed1", "teamNumberRed2", "teamNumberRed3"];
  const blueKeys = [
    "blue1",
    "blue2",
    "blue3",
    "teamNumberBlue1",
    "teamNumberBlue2",
    "teamNumberBlue3",
  ];
  const inRed = redKeys.some((k) => pickNumber(row, [k]) === teamNumber);
  if (inRed) return "red";
  const inBlue = blueKeys.some((k) => pickNumber(row, [k]) === teamNumber);
  if (inBlue) return "blue";
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { code: true, tbaEventKey: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId: session.id },
      select: { teamId: true, team: { select: { number: true, name: true } } },
      orderBy: { team: { number: "asc" } },
    });
    if (assignments.length === 0) return NextResponse.json({ rows: [] });

    const auth = getFrcAuthHeader();
    const parsed = getSeasonAndEventCode(event.tbaEventKey ?? event.code);
    let frcRows: FrcScoreRow[] = [];
    let scheduleRows: Array<Record<string, unknown>> = [];
    let source: "frc" | "none" = "none";

    if (auth && parsed) {
      const [scoresRes, qualRes, playoffRes] = await Promise.all([
        fetch(buildFrcUrl(parsed.season, parsed.eventCode, "scores"), {
          headers: { Authorization: auth, Accept: "application/json" },
          next: { revalidate: 30 },
        }),
        fetch(`${buildFrcUrl(parsed.season, parsed.eventCode, "schedule")}?tournamentLevel=qual`, {
          headers: { Authorization: auth, Accept: "application/json" },
          next: { revalidate: 30 },
        }),
        fetch(`${buildFrcUrl(parsed.season, parsed.eventCode, "schedule")}?tournamentLevel=playoff`, {
          headers: { Authorization: auth, Accept: "application/json" },
          next: { revalidate: 30 },
        }),
      ]);
      if (scoresRes.ok) frcRows = parseFrcScoreRows(await scoresRes.json());
      const qual = qualRes.ok ? parseScheduleRows(await qualRes.json()) : [];
      const playoff = playoffRes.ok ? parseScheduleRows(await playoffRes.json()) : [];
      scheduleRows = [...qual, ...playoff];
      if (frcRows.length > 0) source = "frc";
    }

    const scoutAgg = await prisma.matchScout.groupBy({
      by: ["teamId"],
      where: { eventId, userId: session.id, teamId: { in: assignments.map((a) => a.teamId) } },
      _count: { _all: true },
      _avg: { autoScoreCount: true, gamePieceCount: true },
      _sum: { autoScoreCount: true, gamePieceCount: true },
    });

    const scoutByTeam = new Map(scoutAgg.map((row) => [row.teamId, row]));
    const result = assignments.map((assignment) => {
      const teamScoreRows = frcRows.filter((s) => {
        if (!s.matchNumber) return false;
        return teamAllianceForMatch(scheduleRows, assignment.team.number, s.matchNumber) !== null;
      });
      const frcAllianceScoreContext = teamScoreRows.map((s) => {
        const alliance = s.matchNumber
          ? teamAllianceForMatch(scheduleRows, assignment.team.number, s.matchNumber)
          : null;
        return {
          matchNumber: s.matchNumber ?? null,
          alliance,
          allianceTotalScore: alliance === "red" ? (s.redScore ?? null) : (s.blueScore ?? null),
          auto: alliance === "red" ? (s.redAuto ?? null) : (s.blueAuto ?? null),
          teleop: alliance === "red" ? (s.redTeleop ?? null) : (s.blueTeleop ?? null),
          endgame: alliance === "red" ? (s.redEndgame ?? null) : (s.blueEndgame ?? null),
        };
      });

      const scout = scoutByTeam.get(assignment.teamId);
      return {
        teamNumber: assignment.team.number,
        teamName: assignment.team.name ?? null,
        source,
        frcAllianceScoreContext,
        scoutContribution: {
          matchesScouted: scout?._count._all ?? 0,
          avgAuto: Number((scout?._avg.autoScoreCount ?? 0).toFixed(2)),
          avgTeleop: Number((scout?._avg.gamePieceCount ?? 0).toFixed(2)),
          totalAuto: scout?._sum.autoScoreCount ?? 0,
          totalTeleop: scout?._sum.gamePieceCount ?? 0,
        },
      };
    });

    return NextResponse.json({ rows: result });
  } catch (error) {
    console.error("[events/:id/live-team-scoring]", error);
    return NextResponse.json({ error: "Failed to build team scoring" }, { status: 500 });
  }
}

