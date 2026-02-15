import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRows(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: eventId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all"; // all | teams | full

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      eventTeams: { include: { team: true } },
      pitScouts: { include: { team: true } },
      matchScouts: { include: { team: true, match: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (type === "teams") {
    const headers = [
      "team_number",
      "team_name",
      "drivetrain",
      "robot_type",
      "intake",
      "shooter",
      "climb_capability",
      "climb_system_description",
      "team_told_us",
      "scout_observations",
      "avg_auto_score",
      "climb_success_rate",
      "match_count",
    ];
    const teamIds = [...new Set(event.eventTeams.map((et) => et.teamId))];
    const rows: string[][] = [headers];
    for (const tid of teamIds) {
      const team = event.eventTeams.find((et) => et.teamId === tid)?.team;
      if (!team) continue;
      const pit = event.pitScouts.find((p) => p.teamId === tid);
      const matchScouts = event.matchScouts.filter((m) => m.teamId === tid);
      const withAuto = matchScouts.filter((m) => m.autoAttempted);
      const avgAuto =
        withAuto.length > 0
          ? (withAuto.reduce((s, m) => s + m.autoScoreCount, 0) / withAuto.length).toFixed(2)
          : "";
      const withClimb = matchScouts.filter((m) => m.climbAttempted);
      const climbRate =
        withClimb.length > 0
          ? (withClimb.filter((m) => m.climbSuccess).length / withClimb.length).toFixed(2)
          : "";
      rows.push([
        String(team.number),
        team.name ?? "",
        pit?.drivetrainType ?? "",
        pit?.robotType ?? "",
        pit?.intakeType ?? "",
        pit?.shooterType ?? "",
        pit?.climbCapability ?? "",
        pit?.climbSystemDescription ?? "",
        pit?.teamToldUs ?? "",
        pit?.scoutObservations ?? "",
        avgAuto,
        climbRate,
        String(matchScouts.length),
      ]);
    }
    const csv = "\uFEFF" + csvRows(rows); // BOM for Excel
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="event-${event.code}-team-summaries.csv"`,
      },
    });
  }

  if (type === "full") {
    const headers = [
      "event_id",
      "event_code",
      "team_number",
      "match_number",
      "match_type",
      "auto_attempted",
      "auto_score",
      "auto_consistency",
      "game_piece_count",
      "cycle_speed",
      "defense_played",
      "climb_attempted",
      "climb_success",
      "climb_type",
      "driver_skill",
      "scout_comments",
    ];
    const rows: string[][] = [headers];
    for (const ms of event.matchScouts) {
      rows.push([
        eventId,
        event.code,
        String(ms.team.number),
        String(ms.match.matchNumber),
        ms.match.matchType,
        ms.autoAttempted ? "1" : "0",
        String(ms.autoScoreCount),
        ms.autoConsistency != null ? String(ms.autoConsistency) : "",
        String(ms.gamePieceCount),
        ms.cycleSpeed ?? "",
        ms.defensePlayed ? "1" : "0",
        ms.climbAttempted ? "1" : "0",
        ms.climbSuccess ? "1" : "0",
        ms.climbType ?? "",
        ms.driverSkill != null ? String(ms.driverSkill) : "",
        ms.scoutComments ?? "",
      ]);
    }
    const csv = "\uFEFF" + csvRows(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="event-${event.code}-full-data.csv"`,
      },
    });
  }

  // type === "all": pit scouts + match scouts as two sections or one combined export
  const pitHeaders = [
    "event_id",
    "team_number",
    "drivetrain",
    "robot_type",
    "intake",
    "shooter",
    "climb_capability",
    "climb_system_description",
    "team_told_us",
    "scout_observations",
  ];
  const pitRows: string[][] = [pitHeaders];
  for (const p of event.pitScouts) {
    pitRows.push([
      eventId,
      String(p.team.number),
      p.drivetrainType,
      p.robotType,
      p.intakeType ?? "",
      p.shooterType ?? "",
      p.climbCapability ?? "",
      p.climbSystemDescription ?? "",
      p.teamToldUs ?? "",
      p.scoutObservations ?? "",
    ]);
  }
  const matchHeaders = [
    "event_id",
    "team_number",
    "match_number",
    "match_type",
    "auto_attempted",
    "auto_score",
    "auto_description",
    "auto_consistency",
    "game_piece_count",
    "cycle_speed",
    "defense_played",
    "climb_attempted",
    "climb_success",
    "climb_type",
    "requested_strategy",
    "driver_skill",
    "scout_comments",
  ];
  const matchRows: string[][] = [matchHeaders];
  for (const ms of event.matchScouts) {
    matchRows.push([
      eventId,
      String(ms.team.number),
      String(ms.match.matchNumber),
      ms.match.matchType,
      ms.autoAttempted ? "1" : "0",
      String(ms.autoScoreCount),
      ms.autoDescription ?? "",
      ms.autoConsistency != null ? String(ms.autoConsistency) : "",
      String(ms.gamePieceCount),
      ms.cycleSpeed ?? "",
      ms.defensePlayed ? "1" : "0",
      ms.climbAttempted ? "1" : "0",
      ms.climbSuccess ? "1" : "0",
      ms.climbType ?? "",
      ms.requestedStrategy ?? "",
      ms.driverSkill != null ? String(ms.driverSkill) : "",
      ms.scoutComments ?? "",
    ]);
  }
  const combined =
    "PIT SCOUTING\r\n" +
    csvRows(pitRows) +
    "\r\n\r\nMATCH SCOUTING\r\n" +
    csvRows(matchRows);
  const csv = "\uFEFF" + combined;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${event.code}-all-data.csv"`,
    },
  });
}
