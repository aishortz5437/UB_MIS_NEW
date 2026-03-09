-- Notification system for Director & AD roles
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read) WHERE read = false;

-- Index for listing notifications sorted by time
CREATE INDEX IF NOT EXISTS idx_notifications_user_time
  ON public.notifications(user_id, created_at DESC);

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO anon;
