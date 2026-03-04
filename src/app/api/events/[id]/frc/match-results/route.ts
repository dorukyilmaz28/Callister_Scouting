import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  getFrcAuthHeader,
  getSeasonAndEventCode,
  buildFrcUrl,
} from "@/lib/frc-api";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

function hasMatchScores(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const arr =
    o.MatchScores ?? o.matchScores ?? o.matches ?? o.Matches ?? o.MatchResults ?? o.matchResults;
  return Array.isArray(arr) && arr.length > 0;
}

function tbaMatchesToScores(tbaMatches: unknown): {
  MatchScores: Array<{ matchNumber: number; matchType: string; redScore?: number; blueScore?: number }>;
} {
  if (!Array.isArray(tbaMatches)) return { MatchScores: [] };
  const list = tbaMatches
    .filter((m): m is Record<string, unknown> => m != null && typeof m === "object")
    .map((m) => {
      const alliances = m.alliances as { red?: { score?: number }; blue?: { score?: number } } | undefined;
      const compLevel = (m.comp_level as string) ?? "qm";
      const matchType = compLevel === "qm" ? "qual" : compLevel;
      return {
        matchNumber: typeof m.match_number === "number" ? m.match_number : 0,
        matchType,
        redScore: alliances?.red?.score,
        blueScore: alliances?.blue?.score,
      };
    })
    .filter((m) => m.matchNumber > 0);
  return { MatchScores: list };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { code: true, tbaEventKey: true },
    });
    if (!event)
      return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });

    let data: unknown = null;
    const auth = getFrcAuthHeader();
    if (auth) {
      const codeOrKey = event.tbaEventKey ?? event.code;
      const parsed = getSeasonAndEventCode(codeOrKey);
      if (parsed) {
        const baseUrl = (path: "matches" | "scores") =>
          `${buildFrcUrl(parsed.season, parsed.eventCode, path)}?tournamentLevel=qual`;

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

        if (res.status === 304) return new NextResponse(null, { status: 304 });
        if (res.ok) {
          const text = await res.text();
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = null;
          }
        }
      }
    }

    if (hasMatchScores(data)) return NextResponse.json(data);

    const tbaKey = process.env.TBA_API_KEY;
    const rawCode = event.code ? String(event.code).trim() : "";
    const eventKey = event.tbaEventKey
      ?? (rawCode
        ? /^\d{4}/.test(rawCode)
          ? rawCode
          : `${new Date().getFullYear()}${rawCode}`
        : null);
    if (tbaKey && eventKey) {
      try {
        const tbaRes = await fetch(
          `${TBA_BASE}/event/${encodeURIComponent(eventKey)}/matches`,
          { headers: { "X-TBA-Auth-Key": tbaKey }, next: { revalidate: 120 } }
        );
        if (tbaRes.ok) {
          const tbaData = await tbaRes.json();
          const scores = tbaMatchesToScores(tbaData);
          if (scores.MatchScores.length > 0)
            return NextResponse.json({ ...scores, _source: "tba" });
        }
      } catch (e) {
        console.warn("[frc/match-results] TBA fallback failed", e);
      }
    }

    if (data && typeof data === "object" && "error" in (data as object))
      return NextResponse.json(data);

    return NextResponse.json({
      error:
        "Bu etkinlik için henüz maç verisi yok (FRC ve TBA'da skor bulunamadı).",
      MatchScores: [],
    });
  } catch (e) {
    console.error("[frc/match-results]", e);
    return NextResponse.json({
      error: "Maç sonuçları alınamadı.",
      MatchScores: [],
    });
  }
}
