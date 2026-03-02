/**
 * FRC Events API (firstinspires.org) - sunucu tarafı helper.
 * Token client'a hiç gönderilmez.
 */

const FRC_API_BASE = "https://frc-api.firstinspires.org/v3.0";

export function getFrcAuthHeader(): string | null {
  const user = process.env.FRC_EVENTS_API_USER;
  const key = process.env.FRC_EVENTS_API_KEY;
  if (!user || !key) return null;
  const token = Buffer.from(`${user}:${key}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

/**
 * Event.code veya tbaEventKey "2026txcmp" formatında.
 * FRC API: season=2026, eventCode=txcmp
 */
export function getSeasonAndEventCode(
  codeOrKey: string | null | undefined
): { season: number; eventCode: string } | null {
  const s = (codeOrKey ?? "").trim();
  if (s.length < 5) return null;
  const year = parseInt(s.slice(0, 4), 10);
  if (Number.isNaN(year) || year < 1992 || year > 2100) return null;
  const eventCode = s.slice(4);
  if (!eventCode) return null;
  return { season: year, eventCode };
}

export function buildFrcUrl(
  season: number,
  eventCode: string,
  path: "scores" | "schedule" | "rankings"
): string {
  return `${FRC_API_BASE}/${season}/${path}/${encodeURIComponent(eventCode)}`;
}

export { FRC_API_BASE };
