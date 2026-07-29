import {
  ShieldCheckIcon,
  CircleStackIcon,
  EnvelopeIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "Authentication",
    description:
      "Email and password sign-in with required verification, password reset, and session-aware route protection.",
  },
  {
    icon: CircleStackIcon,
    title: "Postgres",
    description:
      "A plain pg connection pool, a repository layer, and a migration runner that applies plain SQL files in order.",
  },
  {
    icon: EnvelopeIcon,
    title: "Transactional email",
    description:
      "SMTP delivery through nodemailer with branded HTML templates for confirmation and password reset.",
  },
  {
    icon: CreditCardIcon,
    title: "Subscriptions",
    description:
      "A provider-agnostic billing interface with Paddle wired up, signature-verified webhooks, and replay protection.",
  },
  {
    icon: CloudArrowUpIcon,
    title: "Object storage",
    description:
      "S3-compatible uploads with per-user key prefixes and short-lived signed URLs for private files.",
  },
  {
    icon: RocketLaunchIcon,
    title: "Deployment",
    description:
      "Docker build, GitHub Actions, and Ansible playbooks that put the app and its database on your own server.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="container py-20 text-center sm:py-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-[var(--gray-900)] sm:text-5xl">
            {site.tagline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--gray-600)]">
            {site.description}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/auth/signup" size="lg">
              Get started
            </Button>
            <Button href="/pricing" variant="outline" size="lg">
              See pricing
            </Button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-[var(--gray-200)] bg-white py-20">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Everything wired up already</h2>
              <p className="section-subtitle">
                The parts every product needs, built once so you never build them again.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="card card-hover">
                  <feature.icon className="h-8 w-8 text-[var(--brand-700)]" />
                  <h3 className="mt-4 text-lg font-semibold text-[var(--gray-900)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--gray-600)]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-[var(--brand-900)] py-20 text-center">
          <div className="container">
            <h2 className="text-3xl font-bold text-white">Start building today</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Clone the template, set your environment variables, and ship the part that is actually
              yours.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/auth/signup" variant="white" size="lg">
                Create your account
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
