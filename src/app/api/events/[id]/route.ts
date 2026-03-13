import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      eventTeams: { include: { team: true } },
      scoutAssignments: { include: { user: true, team: true } },
      matches: true,
      _count: { select: { pitScouts: true, matchScouts: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

/** TBA'dan eklenen veya herhangi bir etkinligi sil. Sadece olusturan kullanici veya admin silebilir. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, createdByUserId: true },
    });
    if (!event) return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    const isAdminOrStrategy = user?.role === "admin" || user?.role === "strategy";
    const isCreator = event.createdByUserId === session.id;
    if (!isAdminOrStrategy && !isCreator)
      return NextResponse.json({ error: "Bu etkinliği silemezsiniz." }, { status: 403 });

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[events DELETE]", e);
    return NextResponse.json({ error: "Etkinlik silinemedi" }, { status: 500 });
  }
}
