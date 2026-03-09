import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id)
      return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { eventId?: string };
    const { eventId } = body;
    if (!eventId)
      return NextResponse.json({ error: "eventId gerekli" }, { status: 400 });

    await prisma.pushSubscription.deleteMany({
      where: { userId: session.id, eventId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push/unsubscribe]", e);
    return NextResponse.json({ error: "İptal edilemedi" }, { status: 500 });
  }
}
