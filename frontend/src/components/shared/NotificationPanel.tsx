import { useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../../services/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll();
      const list = res.data.data || res.data.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n: Notification) => !n.isRead).length);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markRead = async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* */ }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* */ }
  };

  const typeIcon = (type: string) => {
    const m: Record<string, string> = {
      absent_alert: '🔴',
      late_entry: '🟡',
      early_exit: '🟠',
      low_attendance: '⚠️',
      consecutive_absent: '🚨',
      system: 'ℹ️',
      general: '📢',
    };
    return m[type] || '🔔';
  };

  const typeColor = (type: string) => {
    const m: Record<string, string> = {
      absent_alert: 'border-l-red-500',
      late_entry: 'border-l-yellow-500',
      early_exit: 'border-l-orange-500',
      low_attendance: 'border-l-red-400',
      consecutive_absent: 'border-l-red-600',
      system: 'border-l-blue-500',
      general: 'border-l-gray-500',
    };
    return m[type] || 'border-l-gray-600';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-gray-400 text-center">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-4xl mb-2">🔔</p>
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {notifications.map(n => (
                <div
                  key={n._id}
                  className={`p-4 border-l-4 ${typeColor(n.type)} ${
                    n.isRead ? 'opacity-60' : 'bg-gray-800/40'
                  } hover:bg-gray-800/60 transition cursor-pointer`}
                  onClick={() => !n.isRead && markRead(n._id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${n.isRead ? 'text-gray-400' : 'text-white'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
