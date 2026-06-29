import { NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/rules";

export async function GET() {
  const messages = getRecentMessages();
  return NextResponse.json(messages);
}
