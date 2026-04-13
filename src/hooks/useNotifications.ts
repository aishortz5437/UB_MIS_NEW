import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Notification } from '@/types/database';

const MAX_NOTIFICATIONS = 50;

/** Roles that receive notifications */
const NOTIF_ROLES = ['Director', 'Assistant Director', 'Admin', 'Co-ordinator'];

export function useNotifications() {
    const { user, role } = useAuth();
    const canSeeNotifications = !!role && NOTIF_ROLES.includes(role);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch recent notifications
    const fetchNotifications = useCallback(async () => {
        if (!user || !canSeeNotifications) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await (supabase as any)
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(MAX_NOTIFICATIONS);

            if (error) {
                console.error('[useNotifications] Fetch error:', error);
                return;
            }

            const items = (data || []) as Notification[];
            setNotifications(items);
            setUnreadCount(items.filter((n) => !n.read).length);
        } catch (err) {
            console.error('[useNotifications] Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }, [user, canSeeNotifications]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time subscription
    useEffect(() => {
        if (!user || !canSeeNotifications) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, canSeeNotifications]);

    // Mark a single notification as read
    const markAsRead = useCallback(
        async (id: string) => {
            if (!user) return;

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));

            await (supabase as any)
                .from('notifications')
                .update({ read: true })
                .eq('id', id)
                .eq('user_id', user.id);
        },
        [user]
    );

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        if (!user) return;

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        await (supabase as any)
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
    }, [user]);

    // Delete a single notification
    const deleteNotification = useCallback(
        async (id: string) => {
            if (!user) return;

            const notif = notifications.find((n) => n.id === id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (notif && !notif.read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }

            await (supabase as any)
                .from('notifications')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
        },
        [user, notifications]
    );

    // Clear all notifications
    const clearAll = useCallback(async () => {
        if (!user) return;

        setNotifications([]);
        setUnreadCount(0);

        await (supabase as any)
            .from('notifications')
            .delete()
            .eq('user_id', user.id);
    }, [user]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refetch: fetchNotifications,
    };
}
