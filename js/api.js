let onUnauthorized;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    throw new Error(body?.error || `The request failed (${response.status}).`);
  }
  return body;
}

