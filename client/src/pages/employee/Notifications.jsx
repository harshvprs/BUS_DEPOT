import { useState, useEffect } from 'react';
import api from '../../api';
import { Bell, CheckCheck } from 'lucide-react';

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/notifications');
    setNotifs(data);
  }

  async function markRead(id) {
    await api.put(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await api.put('/notifications/read-all');
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <Bell size={22} className="text-amber-500" /> Notifications
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-amber-600 hover:underline flex items-center gap-1">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-1">
        {notifs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : notifs.map(n => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
            className={`p-4 rounded-xl cursor-pointer transition-all ${
              n.is_read ? 'bg-white' : 'bg-amber-50 border border-amber-100'
            }`}>
            <div className="flex gap-3">
              {!n.is_read && <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'text-gray-500' : 'text-navy-900 font-medium'}`}>
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
