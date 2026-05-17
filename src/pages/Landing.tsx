'use client';

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gavel,
  Lock,
  Megaphone,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  Vote,
  Wallet,
  X,
  Zap,
  Building2,
  ChevronRight,
  Star,
  Globe2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Local styles (scoped + injected once) ──────────────────────────────────
const LANDING_STYLES = `
@keyframes lp-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes lp-blob-a {
  0%, 100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(40px,-30px) scale(1.08); }
}
@keyframes lp-blob-b {
  0%, 100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(-30px,24px) scale(1.05); }
}
@keyframes lp-grad-pan {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes lp-marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes lp-pulse-ring {
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(2.2); opacity: 0;    }
}

.lp-fade-up        { animation: lp-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.lp-blob-a         { animation: lp-blob-a 16s ease-in-out infinite; }
.lp-blob-b         { animation: lp-blob-b 20s ease-in-out infinite; }
.lp-marquee-track  { animation: lp-marquee 38s linear infinite; }

.lp-gradient-text {
  background: linear-gradient(110deg,
    color-mix(in oklch, var(--primary) 100%, transparent) 0%,
    color-mix(in oklch, var(--primary) 70%, white 30%) 35%,
    color-mix(in oklch, var(--chart-2) 80%, transparent) 70%,
    color-mix(in oklch, var(--primary) 100%, transparent) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
          background-clip: text;
  color: transparent;
  animation: lp-grad-pan 8s linear infinite;
}

.lp-glass {
  background: color-mix(in oklch, var(--card) 70%, transparent);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid color-mix(in oklch, var(--border), white 14%);
}

.lp-card {
  background: color-mix(in oklch, var(--card) 82%, transparent);
  border: 1px solid color-mix(in oklch, var(--border) 75%, transparent);
  border-radius: 20px;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1),
              box-shadow 0.35s cubic-bezier(0.22,1,0.36,1),
              border-color 0.35s ease,
              background 0.35s ease;
  position: relative;
  overflow: hidden;
}
.lp-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(600px circle at var(--mx, 50%) var(--my, 0%),
    color-mix(in oklch, var(--primary) 14%, transparent),
    transparent 60%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}
.lp-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in oklch, var(--primary) 35%, var(--border));
  box-shadow:
    0 24px 60px -20px color-mix(in oklch, var(--primary) 20%, transparent),
    0 8px 24px -8px color-mix(in oklch, black 18%, transparent);
}
.lp-card:hover::before { opacity: 1; }

.lp-stat-num {
  background: linear-gradient(135deg,
    color-mix(in oklch, var(--foreground) 100%, transparent),
    color-mix(in oklch, var(--primary) 90%, var(--foreground)));
  -webkit-background-clip: text;
          background-clip: text;
  color: transparent;
}

.lp-dot-grid {
  background-image: radial-gradient(
    color-mix(in oklch, var(--foreground) 14%, transparent) 1px,
    transparent 1px
  );
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%);
}

.lp-mock-window {
  background: color-mix(in oklch, var(--card) 92%, transparent);
  border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
  border-radius: 18px;
  box-shadow:
    0 40px 80px -30px color-mix(in oklch, var(--primary) 35%, transparent),
    0 18px 44px -18px color-mix(in oklch, black 30%, transparent),
    inset 0 1px 0 color-mix(in oklch, white 16%, transparent);
}

.lp-ring-pulse::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: 9999px;
  border: 2px solid color-mix(in oklch, var(--primary) 60%, transparent);
  animation: lp-pulse-ring 2.4s cubic-bezier(0.22,1,0.36,1) infinite;
}

.lp-divider {
  background: linear-gradient(90deg,
    transparent,
    color-mix(in oklch, var(--border) 90%, transparent),
    transparent);
}
`;

// ─── Helpers ────────────────────────────────────────────────────────────────
type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: string;
};

const FEATURES: Feature[] = [
  {
    icon: Calendar,
    title: 'Meetings & Agendas',
    description: 'Schedule, run, and record board meetings with structured agendas, live notes, and one-click minute generation.',
    accent: 'from-blue-500/15 to-indigo-500/10',
  },
  {
    icon: Vote,
    title: 'Resolutions & Voting',
    description: 'Run secure, auditable votes — single-choice, multi-select, or weighted — with real-time tallies and digital signatures.',
    accent: 'from-violet-500/15 to-fuchsia-500/10',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    description: 'Encrypted document repository with versioning, granular permissions, watermarks, and full audit trails.',
    accent: 'from-emerald-500/15 to-teal-500/10',
  },
  {
    icon: ClipboardList,
    title: 'Tasks & Action Items',
    description: 'Convert decisions into accountable action items with owners, deadlines, dependencies, and progress tracking.',
    accent: 'from-amber-500/15 to-orange-500/10',
  },
  {
    icon: Wallet,
    title: 'Finance Oversight',
    description: 'Live budget summaries, expense reviews, and committee-level financial visibility — without the spreadsheet sprawl.',
    accent: 'from-rose-500/15 to-pink-500/10',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    description: 'Targeted broadcasts with read receipts, pinned priorities, and quiet hours so important news never gets lost.',
    accent: 'from-cyan-500/15 to-sky-500/10',
  },
];

const STATS = [
  { label: 'Organisations', value: '850+', icon: Building2 },
  { label: 'Board members', value: '12k', icon: Users },
  { label: 'Decisions logged', value: '180k', icon: Gavel },
  { label: 'Uptime SLA',       value: '99.98%', icon: ShieldCheck },
];

const WORKFLOW = [
  {
    step: '01',
    icon: Calendar,
    title: 'Plan the meeting',
    body: 'Draft agendas collaboratively, attach prep materials, and notify members with smart reminders.',
  },
  {
    step: '02',
    icon: Vote,
    title: 'Run the session',
    body: 'Quorum tracking, live voting, and minutes captured as the conversation happens — not after.',
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'Execute & audit',
    body: 'Action items flow into owner dashboards, resolutions get signed, and every step is auditable.',
  },
];

const TRUST_BADGES = [
  'SOC 2 Type II',
  'ISO 27001',
  'GDPR Ready',
  'AES‑256 at rest',
  'TLS 1.3 in transit',
  'Region pinning',
];

const TESTIMONIALS = [
  {
    quote:
      'We cut meeting prep time in half. Agendas, minutes, and resolutions live in one place — and our auditors love the trail.',
    name: 'Amina K.',
    role: 'Company Secretary, Sahel Holdings',
  },
  {
    quote:
      'The voting module alone is worth it. Secure, signed, and beautifully simple for non-technical directors.',
    name: 'David O.',
    role: 'Board Chair, Northbridge Co‑op',
  },
  {
    quote:
      'Finally a board portal that looks modern and works on phones without us having to apologise for it.',
    name: 'Priya S.',
    role: 'COO, MeridianHealth',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function Landing() {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Pointer-tracked spotlight on feature cards
  const handleCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const goSignIn = () => setLocation('/auth/signin');
  const goSignUp = () => setLocation('/auth/signup');

  const navLinks = [
    { label: 'Features',  href: '#features' },
    { label: 'Workflow',  href: '#workflow' },
    { label: 'Security',  href: '#security' },
    { label: 'Customers', href: '#testimonials' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <style>{LANDING_STYLES}</style>

      {/* ── Ambient background ───────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 lp-dot-grid opacity-60" />
        <div
          className="lp-blob-a absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--primary) 50%, transparent), transparent 60%)' }}
        />
        <div
          className="lp-blob-b absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle at 60% 40%, color-mix(in oklch, var(--chart-2) 50%, transparent), transparent 60%)' }}
        />
        <div
          className="lp-blob-a absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, color-mix(in oklch, var(--chart-3) 40%, transparent), transparent 60%)' }}
        />
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled ? 'py-2' : 'py-4',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300',
              scrolled ? 'lp-glass shadow-lg shadow-black/5' : 'bg-transparent',
            )}
          >
            <button
              onClick={() => setLocation('/')}
              className="group flex items-center gap-2.5 text-left"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
                <Gavel className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold tracking-tight">e‑Board</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">MIS</span>
              </div>
            </button>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" onClick={goSignIn}>
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={goSignUp}
                className="group gap-1.5 bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="lp-glass mt-2 rounded-2xl p-3 shadow-xl shadow-black/10 md:hidden">
              <nav className="flex flex-col">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="my-2 h-px lp-divider" />
                <Button variant="ghost" size="sm" onClick={goSignIn} className="justify-start">
                  Sign in
                </Button>
                <Button
                  size="sm"
                  onClick={goSignUp}
                  className="mt-1 gap-1.5 bg-gradient-to-br from-primary to-primary/80"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center lp-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Now with AI‑assisted minutes & smart reminders
            </div>

            <h1 className="mb-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              The modern board portal for{' '}
              <span className="lp-gradient-text">decisions that matter.</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg">
              e‑Board MIS brings meetings, resolutions, documents, votes, and action items
              into one secure, beautifully simple workspace — built for boards, committees,
              and the people who keep them running.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={goSignUp}
                className="group h-12 gap-2 bg-gradient-to-br from-primary to-primary/80 px-6 text-base shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={goSignIn}
                className="h-12 gap-2 border-border/70 bg-card/60 px-6 text-base backdrop-blur hover:bg-card"
              >
                <Lock className="h-4 w-4" />
                Sign in
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 14‑day trial</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime</span>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="relative mx-auto mt-16 max-w-5xl lp-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="lp-mock-window p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2 px-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">
                  app.eboard‑mis.com / dashboard
                </span>
              </div>

              <div className="grid grid-cols-12 gap-3 rounded-xl bg-background/50 p-3 sm:p-4">
                {/* Mini sidebar */}
                <div className="col-span-3 hidden flex-col gap-1.5 rounded-lg bg-card/70 p-2.5 sm:flex">
                  {[Calendar, Vote, FileText, ClipboardList, Wallet, Megaphone].map((Icon, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                        i === 0
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="h-2 w-16 rounded-sm bg-current/40" />
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-12 space-y-3 sm:col-span-9">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STATS.map((s, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/60 bg-card/80 p-3"
                      >
                        <s.icon className="mb-1.5 h-3.5 w-3.5 text-primary" />
                        <div className="text-base font-bold tracking-tight">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/60 bg-card/80 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold">Upcoming meetings</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">3 new</Badge>
                      </div>
                      <div className="space-y-1.5">
                        {['Q2 Board Review', 'Audit Committee', 'Strategy Offsite'].map((t, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar className="h-3 w-3 text-primary" />
                              {t}
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                      <div className="mb-2 text-xs font-semibold">Open votes</div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Budget FY26</span><span>72%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-primary to-primary/60" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Charter v3</span><span>48%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-[48%] rounded-full bg-gradient-to-r from-chart-2 to-primary/60" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Bylaws</span><span>91%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-[91%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating decorations */}
            <div className="absolute -left-6 -top-6 hidden lp-card px-3 py-2 text-xs shadow-xl shadow-black/10 sm:flex sm:items-center sm:gap-2">
              <div className="relative">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="font-medium">Resolution signed</span>
            </div>
            <div className="absolute -bottom-6 -right-4 hidden lp-card px-3 py-2 text-xs shadow-xl shadow-black/10 sm:flex sm:items-center sm:gap-2">
              <Vote className="h-4 w-4 text-primary" />
              <span className="font-medium">Quorum reached · 12/15</span>
            </div>
          </div>

          {/* Trust marquee */}
          <div className="mt-20 overflow-hidden">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trusted by boards across 40+ countries
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
              <div className="lp-marquee-track flex w-max gap-12 opacity-70">
                {[...TRUST_BADGES, ...TRUST_BADGES].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={i}
                className="lp-card p-6 lp-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
                onMouseMove={handleCardMove}
              >
                <s.icon className="mb-3 h-5 w-5 text-primary" />
                <div className="lp-stat-num text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              Features
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Everything your board needs.{' '}
              <span className="lp-gradient-text">Nothing it doesn't.</span>
            </h2>
            <p className="text-muted-foreground sm:text-lg">
              Purpose‑built modules that work together — so you stop juggling email threads,
              shared drives, and spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="lp-card p-6 lp-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
                onMouseMove={handleCardMove}
              >
                <div
                  className={cn(
                    'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
                    f.accent,
                  )}
                >
                  <f.icon className="h-6 w-6 text-foreground/80" />
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────────────── */}
      <section id="workflow" className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              How it works
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              From agenda to action — in one flow.
            </h2>
            <p className="text-muted-foreground sm:text-lg">
              A single source of truth for every meeting, every decision, every owner.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-12 hidden h-px lp-divider md:block"
            />
            {WORKFLOW.map((w, i) => (
              <div
                key={w.step}
                className="lp-card relative p-7 lp-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
                onMouseMove={handleCardMove}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25">
                    <w.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Step {w.step}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-tight">{w.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <section id="security" className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lp-card overflow-hidden p-8 sm:p-12 lg:p-16">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div>
                <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
                  Security & Compliance
                </Badge>
                <h2 className="mb-5 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Built for the boardroom.{' '}
                  <span className="lp-gradient-text">Audited like a vault.</span>
                </h2>
                <p className="mb-7 text-muted-foreground sm:text-lg">
                  Enterprise‑grade encryption, fine‑grained role permissions, immutable
                  audit logs, and region pinning so your data stays where your charter
                  needs it.
                </p>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    'AES‑256 encryption at rest',
                    'TLS 1.3 in transit',
                    'Role‑based access control',
                    'SAML / SSO ready',
                    'Immutable audit trail',
                    'GDPR & SOC 2 aligned',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="relative mx-auto h-72 w-72 sm:h-80 sm:w-80">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 to-chart-2/20 blur-2xl" />
                  <div className="relative flex h-full w-full items-center justify-center">
                    <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-2xl shadow-primary/40 lp-ring-pulse sm:h-48 sm:w-48">
                      <ShieldCheck className="h-16 w-16 sm:h-20 sm:w-20" />
                    </div>
                  </div>

                  {[
                    { Icon: Lock,     pos: 'top-2 left-2',     delay: '0ms'   },
                    { Icon: Globe2,   pos: 'top-2 right-2',    delay: '120ms' },
                    { Icon: Zap,      pos: 'bottom-2 left-2',  delay: '240ms' },
                    { Icon: Star,     pos: 'bottom-2 right-2', delay: '360ms' },
                  ].map(({ Icon, pos, delay }, i) => (
                    <div
                      key={i}
                      className={cn(
                        'absolute flex h-12 w-12 items-center justify-center rounded-xl lp-glass shadow-lg lp-fade-up',
                        pos,
                      )}
                      style={{ animationDelay: delay }}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section id="testimonials" className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              Customers
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Loved by chairs, secretaries, and directors.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="lp-card flex flex-col p-7 lp-fade-up"
                style={{ animationDelay: `${i * 90}ms` }}
                onMouseMove={handleCardMove}
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-foreground/90">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 border-t border-border/50 pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-chart-2/30 text-sm font-semibold text-foreground">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl p-10 sm:p-14 lg:p-20 text-center">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklch, var(--primary) 85%, transparent), color-mix(in oklch, var(--chart-2) 60%, transparent))',
              }}
            />
            <div aria-hidden className="absolute inset-0 -z-10 lp-dot-grid opacity-30" />

            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl md:text-5xl">
              Bring your board into one place.
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-primary-foreground/85 sm:text-lg">
              Set up your organisation in minutes. Invite members, schedule your first
              meeting, and replace the email chaos with structure.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={goSignUp}
                className="group h-12 gap-2 bg-white px-7 text-base text-primary hover:bg-white/95"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={goSignIn}
                className="h-12 gap-2 px-7 text-base text-primary-foreground hover:bg-white/10"
              >
                Sign in instead
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative border-t border-border/60 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30">
                  <Gavel className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold tracking-tight">e‑Board</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">MIS</span>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                The modern board portal for meetings, resolutions, documents, and the
                people who run them.
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features"  className="hover:text-foreground">Features</a></li>
                <li><a href="#workflow"  className="hover:text-foreground">Workflow</a></li>
                <li><a href="#security"  className="hover:text-foreground">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={goSignIn}  className="hover:text-foreground">Sign in</button></li>
                <li><button onClick={goSignUp}  className="hover:text-foreground">Get started</button></li>
                <li><a href="mailto:hello@eboard-mis.com" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} e‑Board MIS. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
