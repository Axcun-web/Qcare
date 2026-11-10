/**
 * Calls the backend through the Vite /api proxy with the stored JWT.
 * On a non-2xx response it throws an Error whose message is the server's
 * message; `error.status` holds the HTTP status and `error.errors` the
 * field-level validation errors ({ field: [messages] }) or other details the
 * server sent.
 *
 * A 401 on an authenticated request means the session is over (token
 * expired, or the account was deactivated; the backend checks this on every
 * request), so the token is dropped and the user goes back to the login page.
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
  if (response.status === 401 && token && !path.startsWith("/auth/login")) {
    localStorage.removeItem("qcare_token");
    window.location.assign("/login?sesi=berakhir");
  }
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
  const fieldMessages = error?.errors
    ? Object.values(error.errors)
        .flat()
        .filter((value) => typeof value === "string")
    : [];
  return fieldMessages[0] ?? error?.message ?? "Permintaan gagal diproses";
}

/**
 * Tabel 3.19 exc. 3: deactivating a user who is using the app right now
 * needs a confirmation. `sendRequest(query)` performs the request; it is
 * called with "" first and, after the admin confirms, with "?force=true".
 * Resolves to null when the admin cancels.
 *
 * @param {(query: string) => Promise<unknown>} sendRequest
 */
export async function withActiveUserConfirm(sendRequest) {
  try {
    return await sendRequest("");
  } catch (error) {
    if (error.status === 409 && error.errors?.code === "USER_ACTIVE_NOW") {
      if (!window.confirm(`${error.message}\n\nTetap nonaktifkan?`))
        return null;
      return sendRequest("?force=true");
    }
    throw error;
  }
}
