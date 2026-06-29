import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getRecentMessages } from "@/lib/rules";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const messages = await getRecentMessages(auth.barberId);
  return NextResponse.json(messages);
}
