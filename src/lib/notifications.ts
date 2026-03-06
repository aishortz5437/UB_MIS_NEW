import { supabase } from '@/integrations/supabase/client';
import type { NotificationType } from '@/types/database';

interface NotifyDirectorsParams {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
}

/**
 * Send a notification to all users with Director or Assistant Director roles.
 * Inserts one row per director/AD user into the notifications table.
 * This is fire-and-forget — errors are logged but don't throw.
 */
export async function notifyDirectors(params: NotifyDirectorsParams): Promise<void> {
    try {
        // 1. Find all Director & Assistant Director user IDs
        const { data: directorRoles, error: rolesError } = await (supabase as any)
            .from('user_roles')
            .select('user_id')
            .in('role', ['Director', 'Assistant Director']);

        if (rolesError) {
            console.error('[notifications] Failed to fetch director roles:', rolesError);
            return;
        }

        if (!directorRoles || directorRoles.length === 0) {
            console.warn('[notifications] No Director/AD users found to notify.');
            return;
        }

        // 2. Build notification rows — one per director/AD user
        const rows = directorRoles.map((r: { user_id: string }) => ({
            user_id: r.user_id,
            type: params.type,
            title: params.title,
            message: params.message,
            link: params.link || null,
            metadata: params.metadata || {},
        }));

        // 3. Bulk insert
        const { error: insertError } = await (supabase as any)
            .from('notifications')
            .insert(rows);

        if (insertError) {
            console.error('[notifications] Failed to insert notifications:', insertError);
        }
    } catch (err) {
        // Never block the caller — notifications are best-effort
        console.error('[notifications] Unexpected error:', err);
    }
}
