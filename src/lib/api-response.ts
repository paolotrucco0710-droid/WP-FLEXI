import { NextResponse } from "next/server";

export interface ApiErrorBody {
  success: false;
  error: string;
  code: string;
}

export function apiError(
  message: string,
  code: string,
  status = 400
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200
): NextResponse<T & { success: true }> {
  return NextResponse.json({ success: true, ...data }, { status });
}
