import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getIp } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { confirmSignupEmail, resetPasswordEmail } from "@/lib/email/templates";
import { DeletedAccountRepository } from "@/lib/repositories/deletedAccountRepository";
import { site } from "@/config/site";

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
  databaseHooks: {
    user: {
      create: {
        /**
         * An erased account does not get a clean slate. Without this, signing up
         * again with the same address hands back the free trial and any
         * complimentary access, and the payment provider still holds an archived
         * customer on that address, so the next checkout would fail anyway.
         *
         * Throwing rather than returning false: false aborts the insert silently
         * and the form shows an unexplained failure, while an APIError reaches it
         * as a message the person can act on. The wording does not say an account
         * once existed here, since anyone can type an address into the form.
         */
        before: async (user) => {
          if (await new DeletedAccountRepository(pool).isDeleted(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: `This email address cannot be used to create an account. Contact ${site.supportEmail} if you need help.`,
            });
          }
        },
      },
    },
  },
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
