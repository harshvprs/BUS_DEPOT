import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { Bell, CheckCheck } from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifs(data || []);
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
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
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={22} className="text-amber-400" /> Notifications
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-amber-400 hover:underline flex items-center gap-1">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-1">
        {notifs.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : notifs.map(n => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
            className={`p-4 rounded-xl cursor-pointer transition-all ${
              n.is_read ? 'bg-white/5' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
            <div className="flex gap-3">
              {!n.is_read && <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'text-white/40' : 'text-white font-medium'}`}>
                  {n.message}
                </p>
                <p className="text-xs text-white/30 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
