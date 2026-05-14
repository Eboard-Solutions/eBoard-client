// Print / "Export to PDF" minutes via the browser's native print dialog.
//
// We deliberately avoid adding a PDF dependency (jsPDF / pdfmake / puppeteer)
// — those each cost ~100kB+ and produce worse typography than the browser
// can. Instead we build a clean print-only HTML document, mount it in a
// hidden iframe, and trigger window.print(). The user picks "Save as PDF"
// from the dialog and gets a fully formatted, vector-rendered, selectable
// document with proper page breaks and headers.
//
// Trade-off: the user has to click through the print dialog (one extra
// step) vs. a one-click instant download. Worth it for the file-size and
// quality win.

import type { Meeting, Minutes, MinuteItem } from '@/types/api.types';

type Attendee = {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  rsvpStatus?: string;
};

interface PrintMinutesInput {
  minutes: Minutes | null | undefined;
  meeting: Meeting | null | undefined;
  attendance?: Attendee[];
  orgName?: string;
}

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtTime(value?: string): string {
  if (!value) return '—';
  // HH:mm:ss bare strings
  if (!value.includes('T') && value.includes(':')) {
    const [h, m] = value.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function itemTypeLabel(type?: string): string {
  switch (type) {
    case 'decision': return 'Decision';
    case 'action_item': return 'Action Item';
    case 'discussion': return 'Discussion';
    case 'vote': return 'Vote';
    default: return 'Note';
  }
}

function renderItem(item: MinuteItem): string {
  const lines: string[] = [];
  lines.push(`<div class="item item-${esc(item.type)}">`);
  lines.push(`  <div class="item-head">`);
  lines.push(`    <span class="item-tag tag-${esc(item.type)}">${esc(itemTypeLabel(item.type))}</span>`);
  lines.push(`    <h3 class="item-title">${esc(item.title)}</h3>`);
  lines.push(`  </div>`);
  if (item.content) {
    lines.push(`  <p class="item-body">${esc(item.content)}</p>`);
  }
  if (item.votingDetails) {
    const v = item.votingDetails;
    lines.push(`  <div class="vote-block">`);
    lines.push(`    <p class="vote-q"><strong>Question:</strong> ${esc(v.question)}</p>`);
    lines.push(`    <table class="vote-table">`);
    lines.push(`      <tr><th>In favour</th><th>Against</th><th>Abstain</th><th>Result</th></tr>`);
    lines.push(`      <tr><td>${esc(v.inFavor)}</td><td>${esc(v.against)}</td><td>${esc(v.abstain)}</td><td>${v.isPassed ? 'Passed' : 'Not passed'}</td></tr>`);
    lines.push(`    </table>`);
    lines.push(`  </div>`);
  }
  if (item.actionItemDetails) {
    const a = item.actionItemDetails;
    const assignees = (a.assignedTo ?? []).map((x) => x.name).filter(Boolean).join(', ');
    lines.push(`  <div class="action-block">`);
    if (a.description) lines.push(`    <p>${esc(a.description)}</p>`);
    lines.push(`    <p class="action-meta"><strong>Owner:</strong> ${esc(assignees || 'Unassigned')} · <strong>Due:</strong> ${esc(fmtDate(a.dueDate))} · <strong>Priority:</strong> ${esc(a.priority)}</p>`);
    lines.push(`  </div>`);
  }
  lines.push(`</div>`);
  return lines.join('\n');
}

function buildHtml({ minutes, meeting, attendance, orgName }: PrintMinutesInput): string {
  const title = minutes?.title ?? meeting?.title ?? 'Meeting Minutes';
  const status = minutes?.status ?? 'draft';
  const items = (minutes?.items ?? []).slice().sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const present = (attendance ?? []).filter((a) => ['accepted', 'attended', 'checkedIn'].includes((a.rsvpStatus ?? '').toString()));
  const absent  = (attendance ?? []).filter((a) => ['declined', 'absent'].includes((a.rsvpStatus ?? '').toString()));

  const styles = `
    @page { size: A4; margin: 18mm 16mm 22mm 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; line-height: 1.55; font-size: 11.5pt; }
    h1, h2, h3 { margin: 0; }
    .header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 22px; }
    .org { font-size: 9pt; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; font-weight: 700; }
    .doc-title { font-size: 22pt; font-weight: 700; margin-top: 6px; color: #0f172a; }
    .doc-sub { color: #4b5563; margin-top: 6px; font-size: 10.5pt; }
    .meta { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 10pt; }
    .meta dt { color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; font-size: 8.5pt; }
    .meta dd { margin: 2px 0 8px 0; color: #111827; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-draft     { background: #f3f4f6; color: #4b5563; }
    .status-review    { background: #fef3c7; color: #92400e; }
    .status-approved  { background: #dbeafe; color: #1e40af; }
    .status-published { background: #d1fae5; color: #065f46; }
    .section { margin-top: 24px; page-break-inside: avoid; }
    .section-title { font-size: 13pt; font-weight: 700; color: #0f172a; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px; }
    .summary { background: #f9fafb; border-left: 3px solid #4f46e5; padding: 12px 16px; border-radius: 4px; color: #1f2937; }
    .attendance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .attendance-grid h4 { font-size: 10pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .attendance-grid ul { list-style: none; padding: 0; margin: 0; }
    .attendance-grid li { padding: 4px 0; font-size: 10.5pt; border-bottom: 1px dotted #e5e7eb; }
    .item { margin-bottom: 14px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 6px; page-break-inside: avoid; }
    .item-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 6px; }
    .item-title { font-size: 11.5pt; font-weight: 700; color: #0f172a; }
    .item-body { color: #1f2937; margin: 4px 0 0 0; white-space: pre-wrap; }
    .item-tag { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 999px; }
    .tag-decision    { background: #ede9fe; color: #5b21b6; }
    .tag-action_item { background: #fef3c7; color: #92400e; }
    .tag-discussion  { background: #dbeafe; color: #1e40af; }
    .tag-vote        { background: #fce7f3; color: #9d174d; }
    .tag-general     { background: #f3f4f6; color: #374151; }
    .vote-block, .action-block { margin-top: 8px; padding: 8px 10px; background: #f9fafb; border-radius: 4px; font-size: 10pt; }
    .vote-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .vote-table th, .vote-table td { border: 1px solid #e5e7eb; padding: 4px 8px; text-align: left; font-size: 10pt; }
    .vote-table th { background: #f3f4f6; }
    .action-meta { margin: 4px 0 0 0; color: #4b5563; font-size: 9.5pt; }
    .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8.5pt; color: #9ca3af; display: flex; justify-content: space-between; }
    .signature-row { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .signature-row .sig { border-top: 1px solid #111827; padding-top: 6px; font-size: 9pt; color: #4b5563; }
  `;

  const attendanceSection = (attendance && attendance.length > 0) ? `
    <div class="section">
      <h2 class="section-title">Attendance</h2>
      <div class="attendance-grid">
        <div>
          <h4>Present (${present.length})</h4>
          <ul>${present.map((p) => `<li>${esc(p.name || p.email || '—')}${p.role ? ` <span style="color:#9ca3af">— ${esc(p.role)}</span>` : ''}</li>`).join('') || '<li style="color:#9ca3af">None recorded</li>'}</ul>
        </div>
        <div>
          <h4>Absent (${absent.length})</h4>
          <ul>${absent.map((p) => `<li>${esc(p.name || p.email || '—')}</li>`).join('') || '<li style="color:#9ca3af">None recorded</li>'}</ul>
        </div>
      </div>
    </div>
  ` : '';

  const itemsSection = items.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Minutes</h2>
      ${items.map(renderItem).join('\n')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="header">
    ${orgName ? `<div class="org">${esc(orgName)}</div>` : ''}
    <h1 class="doc-title">${esc(title)}</h1>
    <p class="doc-sub">Official minutes of meeting</p>
    <dl class="meta">
      <div>
        <dt>Date</dt>
        <dd>${esc(fmtDate(meeting?.date))}</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>${esc(fmtTime(meeting?.startTime))} – ${esc(fmtTime(meeting?.endTime))}</dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>${esc(meeting?.location || meeting?.onlineMeetingLink || '—')}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd><span class="status status-${esc(status)}">${esc(status.replace('_', ' '))}</span></dd>
      </div>
    </dl>
  </div>

  ${minutes?.summary ? `
    <div class="section">
      <h2 class="section-title">Summary</h2>
      <div class="summary">${esc(minutes.summary)}</div>
    </div>` : ''}

  ${attendanceSection}
  ${itemsSection}

  <div class="signature-row">
    <div class="sig">Prepared by</div>
    <div class="sig">Approved by</div>
  </div>

  <div class="footer">
    <span>Generated ${esc(new Date().toLocaleString())}</span>
    <span>${esc(title)}</span>
  </div>
</body>
</html>`;
}

// Trigger the browser's print dialog with the rendered minutes document.
// We use a hidden iframe rather than window.open to avoid popup blockers
// and to keep the user on the page they were already on.
export function printMinutes(input: PrintMinutesInput): void {
  if (!input.minutes && !input.meeting) {
    console.warn('printMinutes: nothing to print');
    return;
  }

  const html = buildHtml(input);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'Minutes print preview';
  document.body.appendChild(iframe);

  const cleanup = () => {
    try { document.body.removeChild(iframe); } catch { /* noop */ }
  };

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    console.error('printMinutes: could not access iframe document');
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  // Give the browser a tick to render before invoking print; Safari needs
  // the load event to fire on the iframe or the print dialog opens blank.
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('printMinutes: print failed', err);
    }
    // Defer cleanup so the dialog can finish reading the iframe; one second
    // is plenty and avoids tearing it down while print is still active.
    setTimeout(cleanup, 1000);
  };

  if (iframe.contentWindow && doc.readyState === 'complete') {
    triggerPrint();
  } else {
    iframe.addEventListener('load', triggerPrint, { once: true });
    // Belt and braces — some browsers don't fire load reliably for srcdoc-
    // less iframes that we wrote into manually. Fall back to a timeout.
    setTimeout(triggerPrint, 250);
  }
}
