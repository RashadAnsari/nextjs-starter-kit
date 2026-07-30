import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getIp } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { confirmSignupEmail, resetPasswordEmail } from "@/lib/email/templates";

/**
 * Endpoints worth an audit log line. Sign-in and the password flows are how
 * accounts get taken over, so their failures must be visible: a brute-force
 * run otherwise leaves no trace anywhere.
 */
const AUDITED_PATHS: Record<string, string> = {
  "/sign-in/email": "sign-in",
  "/sign-up/email": "sign-up",
  "/sign-out": "sign-out",
  "/request-password-reset": "password-reset-request",
  "/reset-password": "password-reset",
};

export const auth = betterAuth({
  database: pool,
  hooks: {
    // Runs after every auth endpoint, including ones that failed: a thrown
    // APIError lands in ctx.context.returned instead of unwinding the hook.
    after: createAuthMiddleware(async (ctx) => {
      const action = AUDITED_PATHS[ctx.path];
      if (!action) {
        return;
      }
      const email = typeof ctx.body?.email === "string" ? ctx.body.email : "-";
      const ip = (ctx.headers && getIp(ctx.headers, ctx.context.options)) || "-";
      const returned = ctx.context.returned;
      if (returned instanceof APIError) {
        console.warn(
          "[auth] %s failed email=%s ip=%s reason=%s",
          action,
          email,
          ip,
          returned.status
        );
      } else {
        console.info("[auth] %s ok email=%s ip=%s", action, email, ip);
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: resetPasswordEmail(url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirm your account",
        html: confirmSignupEmail(url),
      });
    },
  },
  plugins: [nextCookies()],
});
