import { site } from "@/config/site";

// Email clients do not support CSS variables or external stylesheets, so every
// style here is inline and the brand colour comes from the site config rather
// than from globals.css.
function shell({
  heading,
  intro,
  buttonLabel,
  url,
  footnote,
}: {
  heading: string;
  intro: string;
  buttonLabel: string;
  url: string;
  footnote: string;
}) {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #fafafa;">
  <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e5e7eb;">
    <p style="font-size: 22px; font-weight: 700; color: ${site.brandColor}; margin: 0 0 24px;">${site.name}</p>
    <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px;">${heading}</h2>
    <p style="font-size: 15px; color: #4b5563; margin: 0 0 28px; line-height: 1.6;">${intro}</p>
    <a href="${url}"
       style="display: inline-block; background: ${site.brandColor}; color: white; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
      ${buttonLabel}
    </a>
    <p style="font-size: 13px; color: #9ca3af; margin: 32px 0 0; line-height: 1.6;">
      ${footnote}
    </p>
  </div>
</div>`;
}

export function confirmSignupEmail(url: string) {
  return shell({
    url,
    heading: "Confirm your account",
    intro:
      "Thanks for signing up. Click the button below to verify your email address and activate your account.",
    buttonLabel: "Confirm email address",
    footnote: "If you didn't create an account, you can safely ignore this email.",
  });
}

export function resetPasswordEmail(url: string) {
  return shell({
    url,
    heading: "Reset your password",
    intro:
      "We received a request to reset your password. Click the button below to choose a new one.",
    buttonLabel: "Reset password",
    footnote:
      "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.",
  });
}
