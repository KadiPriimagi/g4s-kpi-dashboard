/** Small fetch wrapper for client components: throws an Error with a friendly message on failure. */
export async function apiRequest<T = unknown>(method: "GET" | "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the server. Please check your connection.");
  }
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Your session has expired. Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}
