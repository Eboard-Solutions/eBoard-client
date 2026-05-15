// Shared wrapper for every data table on the super-admin pages. Applies a
// consistent visual treatment: rounded card, soft border, subtle gradient
// header strip, tighter row padding, and a polished hover wash. Use it
// instead of wrapping a <Table> in a plain <Card><CardContent />.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableCardProps {
  children: ReactNode;
  className?: string;
}

export function DataTableCard({ children, className }: DataTableCardProps) {
  return (
    <div
      className={cn(
        'sa-table relative overflow-hidden rounded-2xl border border-border/60 bg-card',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none',
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
      <style>{tableStyles}</style>
    </div>
  );
}

// Scoped styles for tables sitting inside DataTableCard. We hit the shadcn
// data-slot attributes so we don't need to thread className onto every cell
// in every page. Keeps the redesign DRY across 8+ pages.
const tableStyles = `
  /* Header strip — muted band with uppercase tracked-out labels */
  .sa-table [data-slot="table-header"] {
    background: linear-gradient(180deg, hsl(var(--muted) / 0.55) 0%, hsl(var(--muted) / 0.35) 100%);
  }
  .sa-table [data-slot="table-header"] [data-slot="table-row"] {
    border-bottom: 1px solid hsl(var(--border) / 0.7);
  }
  .sa-table [data-slot="table-head"] {
    height: 42px;
    padding: 0 14px;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.10em;
    color: hsl(var(--muted-foreground));
  }

  /* Body cells — tighter, more uniform vertical rhythm */
  .sa-table [data-slot="table-cell"] {
    padding: 12px 14px;
    font-size: 13px;
    vertical-align: middle;
  }

  /* Row dividers + hover wash + subtle striping */
  .sa-table [data-slot="table-body"] [data-slot="table-row"] {
    border-bottom: 1px solid hsl(var(--border) / 0.45);
    transition: background-color 140ms ease;
  }
  .sa-table [data-slot="table-body"] [data-slot="table-row"]:last-child {
    border-bottom: 0;
  }
  .sa-table [data-slot="table-body"] [data-slot="table-row"]:hover {
    background-color: hsl(var(--muted) / 0.45);
  }
  .sa-table [data-slot="table-body"] [data-slot="table-row"]:nth-child(even) {
    background-color: hsl(var(--muted) / 0.18);
  }
  .sa-table [data-slot="table-body"] [data-slot="table-row"]:nth-child(even):hover {
    background-color: hsl(var(--muted) / 0.55);
  }

  /* Dark-mode tweaks — borders are too harsh otherwise */
  .dark .sa-table [data-slot="table-body"] [data-slot="table-row"] {
    border-bottom-color: hsl(var(--border) / 0.35);
  }
  .dark .sa-table [data-slot="table-body"] [data-slot="table-row"]:nth-child(even) {
    background-color: hsl(var(--muted) / 0.22);
  }

  /* Avatar/icon tiles inside cells — give them a soft ring */
  .sa-table [data-slot="table-cell"] .sa-tile {
    box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 2px rgba(15,23,42,0.06);
    border: 1px solid hsl(var(--border) / 0.6);
  }

  /* Status badges inside the table — tighter, more readable */
  .sa-table [data-slot="table-cell"] .sa-badge {
    padding: 2px 9px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.6;
  }

  /* The "#" column is purely positional — make it whisper */
  .sa-table [data-slot="table-cell"]:first-child {
    color: hsl(var(--muted-foreground) / 0.65);
    font-variant-numeric: tabular-nums;
    font-size: 11.5px;
    font-weight: 600;
  }
`;
