import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

import { supabase } from '../supabase';
import { LayoutDashboard, Users, QrCode, CalendarClock, FileBarChart, ClipboardList, Bell, LogOut, Bus } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/attendance', icon: QrCode, label: 'Attendance' },
  { to: '/admin/leave', icon: ClipboardList, label: 'Leave Requests' },
  { to: '/admin/schedule', icon: CalendarClock, label: 'Schedule' },
  { to: '/admin/fleet', icon: Bus, label: 'Fleet' },
  { to: '/admin/reports', icon: FileBarChart, label: 'Reports' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadUnread() {
    try {
      if (!user) return;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    } catch {}
  }

  async function toggleNotifs() {
    if (!showNotifs && user) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifs(data || []);
    }
    setShowNotifs(!showNotifs);
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Background orbs */}
      <div className="glass-orb w-96 h-96 bg-amber-500 -top-48 -left-48 fixed" />
      <div className="glass-orb w-80 h-80 bg-blue-500 bottom-0 right-0 fixed" />
      <div className="glass-orb w-64 h-64 bg-teal-400 top-1/2 left-1/3 fixed" />

      {/* Sidebar — frosted dark glass */}
      <aside className="w-64 glass-dark flex flex-col shrink-0 relative z-10 border-r border-white/5" style={{ borderRadius: 0 }}>
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg glow-amber">
              <Bus size={20} className="text-navy-900" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">DepotFlow</h1>
              <p className="text-white/40 text-xs">Smart Workforce Mgmt</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-amber-500/15 text-amber-400 shadow-[0_0_15px_rgba(245,166,35,0.15)]' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-navy-900 text-sm font-bold">
              {user?.name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-white/35 text-xs">Admin</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm w-full transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top bar — frosted glass */}
        <header className="h-16 glass-dark flex items-center justify-between px-6 shrink-0 border-b border-white/5" style={{ borderRadius: 0 }}>
          <div>
            <h2 className="text-white font-semibold">Kempegowda Bus Depot</h2>
            <p className="text-white/40 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="relative">
            <button onClick={toggleNotifs} className="relative p-2 rounded-xl hover:bg-white/8 transition-colors">
              <Bell size={20} className="text-white/60" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg glow-danger">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-12 w-80 glass-dark rounded-xl shadow-2xl z-50 animate-fade-in max-h-96 overflow-hidden flex flex-col border border-white/10">
                  <div className="p-3 border-b border-white/8 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-amber-400 hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifs.length === 0 ? (
                      <p className="p-4 text-white/30 text-sm text-center">No notifications</p>
                    ) : notifs.slice(0, 10).map(n => (
                      <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                        className={`px-4 py-3 border-b border-white/5 text-sm cursor-pointer hover:bg-white/5 ${
                          !n.is_read ? 'bg-amber-500/5' : ''
                        }`}>
                        <div className="flex gap-2">
                          {!n.is_read && <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 shrink-0 glow-amber" />}
                          <div>
                            <p className={!n.is_read ? 'font-medium text-white' : 'text-white/60'}>{n.message}</p>
                            <p className="text-xs text-white/30 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
