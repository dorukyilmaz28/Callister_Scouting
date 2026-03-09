/**
 * Sunucu tarafi: etkinlik programi + son tamamlanan mac numarasi.
 * Cron bildirimleri icin kullanilir.
 */

import { prisma } from "@/lib/db";
import {
  getFrcAuthHeader,
  getSeasonAndEventCode,
  buildFrcUrl,
} from "@/lib/frc-api";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

export type ScheduleMatch = {
  matchNumber: number;
  teamNumbers: number[];
};

function extractTeamNumbers(m: Record<string, unknown>): number[] {
  const nums: number[] = [];
  const teams = m.teams as Array<{ teamNumber?: number }> | undefined;
  if (Array.isArray(teams)) {
    teams.forEach((t) => {
      const n = typeof t?.teamNumber === "number" ? t.teamNumber : undefined;
      if (n != null) nums.push(n);
    });
  }
  const alliances = m.alliances as { red?: { team_keys?: string[]; teamKeys?: string[] }; blue?: { team_keys?: string[]; teamKeys?: string[] } } | undefined;
  if (alliances && typeof alliances === "object") {
    for (const side of [alliances.red, alliances.blue]) {
      const keys = side?.team_keys ?? side?.teamKeys ?? [];
      (keys ?? []).forEach((k) => {
        const num = parseInt(String(k).replace(/^frc/i, ""), 10);
        if (!Number.isNaN(num)) nums.push(num);
      });
    }
  }
  return nums;
}

function parseScheduleFromApi(data: unknown): ScheduleMatch[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  let arr = o.Schedule ?? o.schedule ?? o.Matches ?? o.matches;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m): m is Record<string, unknown> => m != null && typeof m === "object")
    .map((m) => {
      const num = (m.match_number ?? m.matchNumber) as number | undefined;
      const matchNumber = typeof num === "number" ? num : 0;
      const teamNumbers = extractTeamNumbers(m);
      return { matchNumber, teamNumbers };
    })
    .filter((s) => s.matchNumber > 0)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

function getLastCompletedMatchNumber(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const o = data as Record<string, unknown>;
  const arr = o.MatchScores ?? o.matchScores ?? o.matches ?? o.Matches ?? o.MatchResults ?? o.matchResults;
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  let max = 0;
  for (const m of arr) {
    const n = (m as Record<string, unknown>).matchNumber ?? (m as Record<string, unknown>)["match number"];
    if (typeof n === "number" && n > max) max = n;
  }
  return max;
}

export async function getEventScheduleAndProgress(
  eventId: string
): Promise<{ schedule: ScheduleMatch[]; lastCompletedMatch: number }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { code: true, tbaEventKey: true },
  });
  if (!event) return { schedule: [], lastCompletedMatch: 0 };

  const codeOrKey = event.tbaEventKey ?? event.code;
  const parsed = getSeasonAndEventCode(codeOrKey);
  let schedule: ScheduleMatch[] = [];
  let lastCompletedMatch = 0;

  const auth = getFrcAuthHeader();
  if (auth && parsed) {
    const baseUrl = (path: "matches" | "scores") =>
      `${buildFrcUrl(parsed.season, parsed.eventCode, path)}?tournamentLevel=qual`;
    try {
      let res = await fetch(baseUrl("scores"), {
        headers: { Authorization: auth, Accept: "application/json" },
        next: { revalidate: 60 },
      });
      if (!res.ok || res.status === 404) {
        res = await fetch(baseUrl("matches"), {
          headers: { Authorization: auth, Accept: "application/json" },
          next: { revalidate: 60 },
        });
      }
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        lastCompletedMatch = getLastCompletedMatchNumber(data);
      }

      const schedRes = await fetch(
        `${buildFrcUrl(parsed.season, parsed.eventCode, "schedule")}?tournamentLevel=qual`,
        { headers: { Authorization: auth, Accept: "application/json" }, next: { revalidate: 60 } }
      );
      if (schedRes.ok) {
        const schedData = await schedRes.json().catch(() => ({}));
        schedule = parseScheduleFromApi(schedData);
      }
    } catch {
      // ignore
    }
  }

  if (schedule.length === 0) {
    const tbaKey = process.env.TBA_API_KEY;
    const eventKey = event.tbaEventKey
      ?? (event.code
        ? /^\d{4}/.test(String(event.code).trim())
          ? String(event.code).trim()
          : `${new Date().getFullYear()}${String(event.code).trim()}`
        : null);
    if (tbaKey && eventKey) {
      try {
        const tbaRes = await fetch(
          `${TBA_BASE}/event/${encodeURIComponent(eventKey)}/matches`,
          { headers: { "X-TBA-Auth-Key": tbaKey }, next: { revalidate: 120 } }
        );
        if (tbaRes.ok) {
          const tbaData = await tbaRes.json();
          schedule = parseScheduleFromApi(tbaData);
          const played = Array.isArray(tbaData)
            ? tbaData.filter((m: Record<string, unknown>) => (m.actual_time ?? m.time) != null)
            : [];
          if (played.length > 0) {
            let max = 0;
            for (const m of played) {
              const n = (m.match_number ?? m.matchNumber) as number | undefined;
              if (typeof n === "number" && n > max) max = n;
            }
            lastCompletedMatch = max;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return { schedule, lastCompletedMatch };
}

/**
 * Kullanici atanmis takimlarinin siradaki macini bulur.
 * lastCompletedMatch + 1 = siradaki mac numarasi; schedule'da bu takimlarin ilk gectigi mac.
 */
export function getNextMatchForTeams(
  schedule: ScheduleMatch[],
  teamNumbers: number[],
  lastCompletedMatch: number
): { matchNumber: number; matchesUntil: number } | null {
  const nextMatchNum = lastCompletedMatch + 1;
  for (const s of schedule) {
    if (s.matchNumber < nextMatchNum) continue;
    const hasTeam = s.teamNumbers.some((n) => teamNumbers.includes(n));
    if (hasTeam) {
      const matchesUntil = s.matchNumber - lastCompletedMatch;
      return { matchNumber: s.matchNumber, matchesUntil };
    }
  }
  return null;
}
