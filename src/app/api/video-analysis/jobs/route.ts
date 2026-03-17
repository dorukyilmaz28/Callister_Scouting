import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseYouTubeUrl } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id)
      return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const body = await request.json();
    const { youtubeUrl, eventName, matchLabel, focusTeamNumber, notes } = body;

    if (!youtubeUrl || typeof youtubeUrl !== "string")
      return NextResponse.json({ error: "YouTube URL gerekli" }, { status: 400 });

    const parsed = parseYouTubeUrl(youtubeUrl);
    if (!parsed.ok)
      return NextResponse.json({ error: parsed.error }, { status: 400 });

    const job = await prisma.videoAnalysisJob.create({
      data: {
        userId: session.id,
        youtubeUrl: youtubeUrl.trim(),
        youtubeVideoId: parsed.videoId,
        eventName: eventName?.trim() || null,
        matchLabel: matchLabel?.trim() || null,
        focusTeamNumber: focusTeamNumber ? Number(focusTeamNumber) : null,
        notes: notes?.trim() || null,
        status: "queued",
        progress: 0,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    console.error("[video-analysis/jobs POST]", e);
    return NextResponse.json({ error: "İş oluşturulamadı" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.id)
      return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const jobs = await prisma.videoAnalysisJob.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        youtubeVideoId: true,
        title: true,
        eventName: true,
        matchLabel: true,
        focusTeamNumber: true,
        status: true,
        progress: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json(jobs);
  } catch (e) {
    console.error("[video-analysis/jobs GET]", e);
    return NextResponse.json({ error: "İşler yüklenemedi" }, { status: 500 });
  }
}
