import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import webPush from "web-push";
import {
  getEventScheduleAndProgress,
  getNextMatchForTeams,
} from "@/lib/event-schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getMessage(matchesUntil: number, teamNumber: number): string {
  if (matchesUntil <= 0) return `Sıradaki maç Takım ${teamNumber}'ün!`;
  if (matchesUntil === 1) return `Son bir maç kala – sıradaki maç Takım ${teamNumber}'ü scout edeceğin maç.`;
  return `Takım ${teamNumber}'ün maçı ${matchesUntil} maç sonra.`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });

  // cron-job.org: ?secret=XXX veya header Authorization: Bearer XXX
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const valid = querySecret === secret || authHeader === `Bearer ${secret}`;
  if (!valid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate)
    return NextResponse.json({ error: "VAPID not configured" }, { status: 503 });

  webPush.setVapidDetails(
    "mailto:scout@callister.local",
    vapidPublic,
    vapidPrivate
  );

  const subs = await prisma.pushSubscription.findMany({
    include: {
      event: { select: { id: true, name: true } },
      user: { select: { id: true } },
    },
  });

  const byEvent = new Map<string, typeof subs>();
  for (const s of subs) {
    if (!byEvent.has(s.eventId)) byEvent.set(s.eventId, []);
    byEvent.get(s.eventId)!.push(s);
  }

  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let sent = 0;
  for (const [eventId, eventSubs] of byEvent) {
    const { schedule, lastCompletedMatch } = await getEventScheduleAndProgress(eventId);
    if (schedule.length === 0) continue;

    for (const sub of eventSubs) {
      const assignments = await prisma.scoutAssignment.findMany({
        where: { eventId, userId: sub.userId },
        include: { team: true },
      });
      const teamNumbers = assignments.map((a) => a.team.number);
      if (teamNumbers.length === 0) continue;

      const next = getNextMatchForTeams(schedule, teamNumbers, lastCompletedMatch);
      if (!next || next.matchesUntil > 2) continue;
      if (sub.lastNotifiedMatchesUntil === next.matchesUntil) continue;

      const teamNum = teamNumbers[0];
      const title = "Maç hatırlatması";
      const body = getMessage(next.matchesUntil, teamNum);
      const payload = JSON.stringify({
        title,
        body,
        url: `${baseUrl}/events/${eventId}/live-scores`,
      });

      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 60 }
        );
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastNotifiedMatchesUntil: next.matchesUntil },
        });
        sent++;
      } catch (e) {
        if (e && typeof e === "object" && "statusCode" in e && (e.statusCode === 410 || e.statusCode === 404)) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
