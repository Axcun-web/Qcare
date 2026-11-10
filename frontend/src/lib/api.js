/**
 * Calls the backend through the Vite /api proxy with the stored JWT.
 * On a non-2xx response it throws an Error whose message is the server's
 * message; `error.status` holds the HTTP status and `error.errors` the
 * field-level validation errors ({ field: [messages] }) when the server
 * sent any.
 */
export async function api(path, options = {}) {
  const token = localStorage.getItem("qcare_token");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message ?? "Permintaan gagal diproses");
    error.status = response.status;
    error.errors = body.errors ?? null;
    throw error;
  }
  return body;
}

/**
 * First field-level message of an error thrown by `api()`, falling back to
 * the general message. Use it to show one readable line under a form.
 */
export function firstErrorMessage(error) {
  const fieldMessages = error?.errors ? Object.values(error.errors).flat() : [];
  return fieldMessages[0] ?? error?.message ?? "Permintaan gagal diproses";
}
