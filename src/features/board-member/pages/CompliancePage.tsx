'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Shield, AlertCircle, CheckCircle2, Clock, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompliance, useAcknowledgeCompliance } from '@/hooks/api';
import type { ComplianceItem } from '../types';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { EmptyState, unwrapList } from '../components/page-helpers';

export function CompliancePage() {
  const { data } = useCompliance();
  const acknowledge = useAcknowledgeCompliance();
  const items = unwrapList<ComplianceItem>(data);

  const pending = items.filter((c) => !c.isAcknowledged);
  const acknowledged = items.filter((c) => c.isAcknowledged);

  const TYPE_COLORS: Record<string, string> = {
    POLICY: 'bg-violet-100 text-violet-700',
    DISCLOSURE: 'bg-amber-100 text-amber-700',
    REGULATORY: 'bg-red-100 text-red-700',
    ACKNOWLEDGMENT: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <MemberPortalLayout icon={Shield} title="Compliance & Governance" color="bg-slate-700" subtitle="Policy acknowledgments and regulatory requirements">
      {pending.length === 0 && acknowledged.length === 0 ? (
        <EmptyState icon={Shield} title="No compliance items" />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />Pending · {pending.length}
              </h2>
              {pending.map((c) => (
                <div key={c.complianceId} className="rounded-[24px] border border-amber-200/80 dark:border-amber-800/70 bg-amber-50/20 dark:bg-amber-950/10 p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>{c.type}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{c.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                      {c.dueDate && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />Due {formatDistanceToNow(new Date(c.dueDate), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {c.documentUrl && (
                        <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs gap-1.5" asChild>
                          <a href={c.documentUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5" />View
                          </a>
                        </Button>
                      )}
                      <Button size="sm" className="h-9 rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => acknowledge.mutate(c.complianceId)}>
                        <Check className="h-3.5 w-3.5" />Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {acknowledged.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Completed · {acknowledged.length}
              </h2>
              {acknowledged.map((c) => (
                <div key={c.complianceId} className="rounded-[24px] border border-border/60 bg-card p-4 opacity-80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground">{c.title}</p>
                      {c.acknowledgedAt && <p className="text-xs text-muted-foreground mt-0.5">Acknowledged {format(new Date(c.acknowledgedAt), 'MMM d, yyyy')}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>{c.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </MemberPortalLayout>
  );
}