import { NextResponse } from "next/server";
import {
  handleInboundWhatsApp,
  parseMetaWebhookPayload,
} from "@/lib/webhook-handler";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = parseMetaWebhookPayload(body);

    if (!message) {
      return NextResponse.json(
        { error: "Payload non valido" },
        { status: 400 }
      );
    }

    const result = handleInboundWhatsApp(message);

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore webhook" },
      { status: 500 }
    );
  }
}
