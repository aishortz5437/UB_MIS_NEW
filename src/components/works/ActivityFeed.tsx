import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Activity, MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ActivityFeedProps {
  workId: string;
}

interface Remark {
  id: string;
  work_id: string;
  text: string;
  type: string;
  created_at: string;
  author_id: string | null;
  profiles?: { full_name: string | null; email: string } | null;
}

export function ActivityFeed({ workId }: ActivityFeedProps) {
  const [feed, setFeed] = useState<Remark[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const submitInProgress = useRef(false);

  const fetchFeed = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('remarks')
        .select('*, profiles(full_name, email)')
        .eq('work_id', workId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeed((data as any[]) || []);
      setFeedError(false);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load activity feed:', error);
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    setFeedLoading(true);
    void fetchFeed();

    // Setup real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'remarks',
          filter: `work_id=eq.${workId}`
        },
        () => {
          void fetchFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeed, workId]);

  const handleSubmit = async () => {
    const comment = newComment.trim();
    if (!comment || submitInProgress.current) return;
    if (!profile) {
      toast({ title: 'Unable to post comment', description: 'Your user profile is unavailable.', variant: 'destructive' });
      return;
    }

    submitInProgress.current = true;
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.from('remarks').insert({
        work_id: workId,
        text: comment,
        type: 'comment',
        author_id: profile.id
      } as any).select('*').single();

      if (error) throw error;
      if (!data) throw new Error('Comment was not returned after saving.');
      setFeed(current => current.some(item => item.id === data.id)
        ? current
        : [...current, data as Remark].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setNewComment('');
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] rounded-3xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b bg-muted/20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Activity & Comments</h4>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-background border text-[10px] font-black text-muted-foreground/60">
          {feed.length} Updates
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5">
        {feedError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span>Unable to load activity.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void fetchFeed()}>Retry</Button>
          </div>
        )}
        {feed.map((item) => {
          const isSystem = item.type === 'system_log';
          const isMe = item.author_id === profile?.id;
          
          if (isSystem) {
            return (
              <div key={item.id} className="flex justify-center my-4">
                <div className="bg-primary/5 border border-primary/10 px-4 py-2 rounded-full flex items-center gap-2 max-w-[80%]">
                  <Activity className="h-3 w-3 text-primary/60" />
                  <span className="text-xs font-medium text-muted-foreground text-center">
                    {item.text}
                  </span>
                  <span className="text-[9px] text-muted-foreground/50 font-mono ml-2">
                    {format(new Date(item.created_at), 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className={cn("flex gap-3 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {isMe ? 'You' : (item.profiles?.full_name || item.profiles?.email || 'Unknown User')}
                  </span>
                  <span className="text-[9px] text-muted-foreground/50 font-mono">
                    {format(new Date(item.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-white border rounded-tl-sm"
                )}>
                  {item.text}
                </div>
              </div>
            </div>
          );
        })}
        {feedLoading && feed.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading activity...</div>
        )}
        {!feedLoading && !feedError && feed.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
            <MessageSquare className="h-8 w-8" />
            <p className="text-xs font-black uppercase tracking-widest">No activity yet</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t flex gap-3">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isSubmitting}
          placeholder="Type a comment or use @ to mention someone..."
          className="flex-1 bg-muted/30 rounded-2xl border-none px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/50 font-medium"
        />
        <Button 
          onClick={handleSubmit} 
          disabled={!newComment.trim() || isSubmitting}
          className="rounded-2xl h-12 w-12 p-0 shrink-0 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
