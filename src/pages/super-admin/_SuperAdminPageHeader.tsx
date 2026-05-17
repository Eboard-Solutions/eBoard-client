// Shared header used by every page in /super-admin/*. Gradient hero with an
// icon tile, title, subtitle, optional action slot on the right, and an
// optional stat strip embedded at the bottom. Keeps every super-admin page
// visually consistent with the rest of the app (matches CalendarPage's hero).

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type PageStat = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
};

interface SuperAdminPageHeaderProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-side actions (buttons, badges). */
  actions?: ReactNode;
  /** Optional inline stat strip — typically 2–4 entries. */
  stats?: PageStat[];
  /** Tailwind classes for the gradient. Defaults to the violet→indigo brand. */
  gradient?: string;
}

const DEFAULT_GRADIENT =
  'from-violet-600 via-indigo-600 to-blue-700';

export function SuperAdminPageHeader({
  icon: Icon,
  eyebrow = 'Super Admin',
  title,
  subtitle,
  actions,
  stats,
  gradient = DEFAULT_GRADIENT,
}: SuperAdminPageHeaderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br ${gradient} p-6 sm:p-8 text-white shadow-lg shadow-violet-500/20`}
    >
      {/* Decorative orbs */}
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute right-12 -bottom-16 h-40 w-40 rounded-full bg-black/10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur flex items-center justify-center">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-sm" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/80 mt-1.5 max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div
          className={`relative mt-6 grid gap-2 sm:gap-3 ${
            stats.length <= 2
              ? 'grid-cols-2'
              : stats.length === 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {stats.map(({ label, value, icon: StatIcon }) => (
            <div
              key={label}
              className="rounded-2xl bg-white/10 hover:bg-white/15 transition-colors border border-white/15 backdrop-blur px-3 sm:px-4 py-3"
            >
              <div className="flex items-center gap-1.5 text-white/70">
                {StatIcon && <StatIcon className="h-3.5 w-3.5" />}
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {label}
                </span>
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums leading-none">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
