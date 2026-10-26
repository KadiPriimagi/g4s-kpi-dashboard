// Edge-compatible session helpers (used by middleware and API routes).

export const SESSION_COOKIE = "g4s_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Session token = HMAC-SHA256(APP_PASSWORD, fixed message). Changing the password logs everyone out. */
export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("g4s-kpi-dashboard-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password || !token) return false;
  return constantTimeEqual(token, await sessionToken(password));
}
