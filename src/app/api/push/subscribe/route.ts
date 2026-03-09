import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Body = {
  eventId?: string;
  subscription?: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
};

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id)
      return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const body = (await request.json()) as Body;
    const { eventId, subscription } = body;
    if (!eventId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth)
      return NextResponse.json(
        { error: "eventId ve subscription (endpoint, keys) gerekli" },
        { status: 400 }
      );

    await prisma.pushSubscription.upsert({
      where: {
        userId_eventId: { userId: session.id, eventId },
      },
      create: {
        userId: session.id,
        eventId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return NextResponse.json({ error: "Kayıt alınamadı" }, { status: 500 });
  }
}
