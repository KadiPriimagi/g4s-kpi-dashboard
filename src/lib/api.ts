import "server-only";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "./db";

/** Wraps an API handler so database problems return a friendly JSON error instead of a crash. */
export async function apiHandler(fn: () => Promise<Response>): Promise<Response> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "The database is not configured yet (DATABASE_URL is missing)." }, { status: 503 });
  }
  try {
    return await fn();
  } catch (err) {
    console.error("[api] Request failed:", err);
    return NextResponse.json({ error: "Could not reach the database. Please try again in a moment." }, { status: 503 });
  }
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
