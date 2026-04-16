export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("eb_token")
      : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Always include credentials so the HTTP-only session cookie is sent
  const res = await fetch(path, { ...options, headers, credentials: "include" });

  // Do NOT nuke localStorage or redirect on 401.
  // The auth context handles session state — aggressive redirects here
  // were causing users to get logged out on transient errors.
  return res;
}
