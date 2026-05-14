'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMessageThreads, useSendMessage, useCreateThread, useMarkThreadRead, useCurrentUser } from '@/hooks/api';
import type { MessageThread } from '../types';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { unwrapList } from '../components/page-helpers';

export function MessagesPage() {
  const { data } = useMessageThreads();
  const sendMessage = useSendMessage();
  const createThread = useCreateThread();
  const markRead = useMarkThreadRead();
  const { data: currentUser } = useCurrentUser();

  const threads = useMemo(() => unwrapList<MessageThread>(data), [data]);
  const userId = currentUser?.userId ?? 'unknown';

  const [activeId, setActiveId] = useState<string | null>(threads[0]?.threadId ?? null);
  const [message, setMessage] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMsg, setNewMsg] = useState('');

  const active = threads.find((t) => t.threadId === activeId);

  function send() {
    if (!message.trim() || !activeId) return;
    sendMessage.mutate({ threadId: activeId, content: message.trim() });
    setMessage('');
  }

  return (
    <MemberPortalLayout icon={MessageSquare} title="Messages" color="bg-emerald-600" subtitle="Secure board communications">
      <div className="flex justify-end mb-4">
        <Button size="sm" className="h-9 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setNewOpen(true)}>
          <Plus className="h-3.5 w-3.5" />New Thread
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 min-h-[70vh]">
        <div className="rounded-[24px] border border-border/60 bg-card overflow-hidden flex flex-col min-h-[320px] lg:min-h-0">
          <div className="p-3 border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.24em]">{threads.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              threads.map((t) => {
                const hasUnread = t.messages.some((m) => !m.readBy.includes(userId) && m.senderId !== userId);
                return (
                  <button
                    key={t.threadId}
                    type="button"
                    onClick={() => { setActiveId(t.threadId); markRead.mutate(t.threadId); }}
                    className={`w-full text-left p-4 transition-colors border-b border-border/30 last:border-0 ${
                      activeId === t.threadId ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {hasUnread && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                      {!hasUnread && <span className="h-2 w-2 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium line-clamp-1 ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>{t.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.lastMessage}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-border/60 bg-card overflow-hidden flex flex-col min-h-[420px]">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Select a conversation</p></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border/40">
                <p className="text-sm font-semibold tracking-tight">{active.subject}</p>
                <p className="text-xs text-muted-foreground">{active.participantNames.join(', ')}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                {active.messages.filter((m) => !m.isDeleted).map((msg) => {
                  const isMine = msg.senderId === userId;
                  return (
                    <div key={msg.messageId} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMine ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'}`}>
                        {msg.senderName[0]}
                      </div>
                      <div className={`max-w-[82%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMine && <p className="text-xs text-muted-foreground mb-1">{msg.senderName}</p>}
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-background text-foreground rounded-tl-sm border border-border/60'}`}>{msg.content}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2 bg-background">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message…" className="flex-1 h-10 rounded-xl text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button size="sm" className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" onClick={send} disabled={!message.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={(o) => { if (!o) setNewOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>New Conversation</DialogTitle><DialogDescription>Start a new message thread</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject" /></div>
            <div className="space-y-1.5"><Textarea value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Message" rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
              if (!newSubject.trim() || !newMsg.trim()) { toast.error('Subject and message required'); return; }
              createThread.mutate({ subject: newSubject.trim(), participants: [], initialMessage: newMsg.trim() });
              setNewOpen(false); setNewSubject(''); setNewMsg('');
              toast.success('Thread created');
            }}>
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
  );
}