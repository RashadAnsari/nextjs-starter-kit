import { createAuthClient } from "better-auth/react";

/** Browser auth client. Same origin, so no baseURL is needed. */
export const authClient = createAuthClient();

/** Message to show in an ErrorBanner for a failed auth call. */
export function authErrorMessage(error: { message?: string } | null) {
  return error?.message || "Something went wrong. Please try again.";
}
