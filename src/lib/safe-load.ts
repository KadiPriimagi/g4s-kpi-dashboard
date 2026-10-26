import "server-only";
import { isDatabaseConfigured } from "./db";

export type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Runs a database read and turns failures into a friendly message instead of crashing the page. */
export async function safeLoad<T>(fn: () => Promise<T>): Promise<LoadResult<T>> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "The database is not configured yet. Set DATABASE_URL in the Railway service variables." };
  }
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    console.error("[db] Query failed:", err);
    return { ok: false, error: "Could not reach the database. Please try again in a moment." };
  }
}
