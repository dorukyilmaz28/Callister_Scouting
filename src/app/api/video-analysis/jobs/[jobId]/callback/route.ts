import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

/**
 * Callback endpoint called by the Python worker when analysis completes or fails.
 * Authenticated via VIDEO_ANALYSIS_WORKER_SECRET.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const secret = process.env.VIDEO_ANALYSIS_WORKER_SECRET;
    if (!secret)
      return NextResponse.json({ error: "Not configured" }, { status: 503 });

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;
    const body = await request.json();
    const { status, progress, error_message, result } = body;

    const job = await prisma.videoAnalysisJob.findUnique({ where: { id: jobId } });
    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (status === "failed") {
      await prisma.videoAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          progress: progress ?? job.progress,
          errorMessage: error_message ?? "Analiz başarısız",
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (status === "progress") {
      await prisma.videoAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: "analyzing",
          progress: Math.min(99, progress ?? job.progress),
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (status === "completed" && result) {
      const analysisResult = await prisma.videoAnalysisResult.create({
        data: {
          jobId,
          summaryJson: result.summary ?? null,
          rawMetricsJson: result.raw_metrics ?? null,
        },
      });

      if (Array.isArray(result.teams)) {
        for (const team of result.teams) {
          await prisma.analyzedTeam.create({
            data: {
              resultId: analysisResult.id,
              teamNumber: team.team_number,
              avgCycleTime: team.avg_cycle_time ?? null,
              estimatedScoreAttempts: team.estimated_score_attempts ?? null,
              estimatedDefenseTimeSec: team.estimated_defense_time_sec ?? null,
              idleTimeSec: team.idle_time_sec ?? null,
              movementDistance: team.movement_distance ?? null,
              zoneEntriesJson: team.zone_entries ?? null,
              notesJson: team.notes ?? null,
            },
          });
        }
      }

      if (Array.isArray(result.events)) {
        for (const ev of result.events) {
          await prisma.analysisEvent.create({
            data: {
              resultId: analysisResult.id,
              timestampSec: ev.timestamp_sec,
              eventType: ev.event_type,
              teamNumber: ev.team_number ?? null,
              confidence: ev.confidence ?? null,
              metadataJson: ev.metadata ?? null,
            },
          });
        }
      }

      await prisma.videoAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          progress: 100,
          title: result.title ?? job.title,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid callback payload" }, { status: 400 });
  } catch (e) {
    console.error("[video-analysis callback]", e);
    return NextResponse.json({ error: "Callback failed" }, { status: 500 });
  }
}
