// server/routes/dashboard.ts
// GET /api/dashboard/stats  — aggregates all dashboard data in one round-trip

import { Router, Request, Response } from 'express';
import { storage } from '../storage';    // your existing IStorage instance
import { requireAuth } from '../auth';   // your existing auth middleware

const router = Router();

router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    // ── Pull raw data from storage ─────────────────────────────────
    const [
      meetings,
      tasks,
      polls,
      documents,
      members,
      transactions,
      attendanceRecords,
    ] = await Promise.all([
      storage.getMeetings(),
      storage.getTasks(),
      storage.getDocuments(),
      storage.getPolls ? storage.getPolls() : [],         // graceful fallback
      storage.getMembers ? storage.getMembers() : [],
      storage.getTransactions ? storage.getTransactions() : [],
      storage.getAttendanceRecords ? storage.getAttendanceRecords() : [],
    ]);

    const now = new Date();

    // ── Upcoming meetings (future only, sorted soonest-first) ──────
    const upcomingMeetings = meetings
      .filter((m) => new Date(m.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 6)
      .map((m) => ({
        id:            m.id,
        title:         m.title,
        scheduledAt:   m.scheduledAt,
        location:      m.location ?? null,
        attendeeCount: m.attendees?.length ?? null,
      }));

    // ── Open tasks ─────────────────────────────────────────────────
    const openTasks = tasks
      .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        const p = { high: 0, medium: 1, low: 2 };
        return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
      })
      .map((t) => ({
        id:       t.id,
        title:    t.title,
        dueDate:  t.dueDate ?? null,
        priority: t.priority ?? 'medium',
        assignee: t.assigneeId ?? null,   // resolve name via members if needed
        status:   t.status,
      }));

    // ── Active polls ───────────────────────────────────────────────
    const activePolls = polls
      .filter((p) => p.status === 'open' && new Date(p.endsAt) > now)
      .map((p) => ({
        id:            p.id,
        title:         p.title,
        totalVotes:    p.votes?.length ?? p.totalVotes ?? 0,
        requiredVotes: p.requiredVotes ?? members.length,
        endsAt:        p.endsAt,
        status:        p.status,
      }));

    // ── Recent documents ───────────────────────────────────────────
    const recentDocuments = documents
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((d) => ({
        id:        d.id,
        title:     d.title,
        updatedAt: d.updatedAt,
        type:      d.fileType ?? d.type ?? 'other',
        author:    d.authorId ?? null,
      }));

    // ── Budget summary ─────────────────────────────────────────────
    const budgetItems = transactions.filter((t) => t.type === 'expense');
    const totalBudget = transactions
      .filter((t) => t.type === 'budget')
      .reduce((s, t) => s + (t.amount ?? 0), 0) || 50_000;   // default if no budget row
    const totalSpent  = budgetItems.reduce((s, t) => s + (t.amount ?? 0), 0);

    const recentTransactions = transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map((t) => ({ label: t.description, amount: t.amount, date: t.date }));

    const budgetSummary = {
      total:        totalBudget,
      spent:        totalSpent,
      remaining:    totalBudget - totalSpent,
      percentUsed:  totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      recentTransactions,
    };

    // ── Attendance trend ───────────────────────────────────────────
    const memberCount   = members.length;
    const recentMeeting = meetings
      .filter((m) => new Date(m.scheduledAt) <= now)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

    const presentCount = recentMeeting?.attendees?.length ?? Math.round(memberCount * 0.78);
    const rate         = memberCount > 0 ? Math.round((presentCount / memberCount) * 100) : 0;

    // Build 6-month history from attendance records if available
    const history: { month: string; rate: number }[] = [];
    if (attendanceRecords.length > 0) {
      // group by month, compute rate
      const byMonth: Record<string, { present: number; total: number }> = {};
      for (const rec of attendanceRecords) {
        const key = new Date(rec.date).toLocaleDateString('en-US', { month: 'short' });
        if (!byMonth[key]) byMonth[key] = { present: 0, total: 0 };
        byMonth[key].total   += 1;
        byMonth[key].present += rec.present ? 1 : 0;
      }
      for (const [month, v] of Object.entries(byMonth).slice(-6)) {
        history.push({ month, rate: Math.round((v.present / v.total) * 100) });
      }
    }

    // simple trend: compare last two months
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (history.length >= 2) {
      const last   = history[history.length - 1].rate;
      const prev   = history[history.length - 2].rate;
      if (last > prev + 2) trend = 'up';
      else if (last < prev - 2) trend = 'down';
    }

    const attendanceTrend = {
      rate,
      trend,
      totalMembers: memberCount,
      presentCount,
      history,
    };

    // ── Response ───────────────────────────────────────────────────
    res.json({
      upcomingMeetings,
      openTasks,
      activePolls,
      recentDocuments,
      budgetSummary,
      attendanceTrend,
      memberCount,
    });
  } catch (err) {
    console.error('[dashboard/stats]', err);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

export default router;