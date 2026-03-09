import { NextResponse } from "next/server";

/** Istemci push subscribe icin VAPID public key. */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Bildirimler yapılandırılmamış (VAPID_PUBLIC_KEY)" },
      { status: 503 }
    );
  return NextResponse.json({ publicKey: key });
}
