import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.id)
      return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const { jobId } = await params;
    const job = await prisma.videoAnalysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== session.id)
      return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });

    if (job.status !== "queued" && job.status !== "failed")
      return NextResponse.json(
        { error: "Bu iş zaten başlatılmış veya tamamlanmış" },
        { status: 400 }
      );

    const workerUrl = process.env.VIDEO_ANALYSIS_WORKER_URL;
    if (!workerUrl) {
      return NextResponse.json(
        { error: "Video analiz servisi yapılandırılmamış (VIDEO_ANALYSIS_WORKER_URL)" },
        { status: 503 }
      );
    }

    const callbackBase =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    await prisma.videoAnalysisJob.update({
      where: { id: jobId },
      data: { status: "downloading", progress: 5, errorMessage: null },
    });

    const workerSecret = process.env.VIDEO_ANALYSIS_WORKER_SECRET ?? "";

    fetch(`${workerUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({
        job_id: jobId,
        youtube_url: job.youtubeUrl,
        youtube_video_id: job.youtubeVideoId,
        focus_team_number: job.focusTeamNumber,
        callback_url: `${callbackBase}/api/video-analysis/jobs/${jobId}/callback`,
        callback_secret: workerSecret,
      }),
    }).catch((err) => {
      console.error("[video-analysis start] worker request failed:", err);
      prisma.videoAnalysisJob
        .update({
          where: { id: jobId },
          data: { status: "failed", errorMessage: "Worker servise bağlanılamadı" },
        })
        .catch(() => {});
    });

    return NextResponse.json({ ok: true, status: "downloading" });
  } catch (e) {
    console.error("[video-analysis/jobs/[jobId]/start]", e);
    return NextResponse.json({ error: "Başlatılamadı" }, { status: 500 });
  }
}
