import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api';
import { LayoutDashboard, Users, QrCode, CalendarClock, FileBarChart, ClipboardList, Bell, LogOut, Bus } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/attendance', icon: QrCode, label: 'Attendance' },
  { to: '/admin/leave', icon: ClipboardList, label: 'Leave Requests' },
  { to: '/admin/schedule', icon: CalendarClock, label: 'Schedule' },
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
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {}
  }

  async function toggleNotifs() {
    if (!showNotifs) {
      const { data } = await api.get('/notifications');
      setNotifs(data);
    }
    setShowNotifs(!showNotifs);
  }

  async function markRead(id) {
    await api.put(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await api.put('/notifications/read-all');
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-sidebar flex flex-col shrink-0">
        <div className="p-5 border-b border-navy-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <Bus size={20} className="text-navy-900" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">DepotFlow</h1>
              <p className="text-navy-400 text-xs">Smart Workforce Mgmt</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-amber-500/15 text-amber-400' : 'text-navy-300 hover:text-white hover:bg-navy-800'
                }`
              }>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-navy-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-navy-700 rounded-full flex items-center justify-center text-amber-400 text-sm font-bold">
              {user?.name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-navy-400 text-xs">Admin</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-navy-400 hover:text-white text-sm w-full transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="text-navy-900 font-semibold">Kempegowda Bus Depot</h2>
            <p className="text-gray-500 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="relative">
            <button onClick={toggleNotifs} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-fade-in max-h-96 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-amber-600 hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifs.length === 0 ? (
                      <p className="p-4 text-gray-400 text-sm text-center">No notifications</p>
                    ) : notifs.slice(0, 10).map(n => (
                      <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                        className={`px-4 py-3 border-b border-gray-50 text-sm cursor-pointer hover:bg-gray-50 ${
                          !n.is_read ? 'bg-amber-50/50' : ''
                        }`}>
                        <div className="flex gap-2">
                          {!n.is_read && <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 shrink-0" />}
                          <div>
                            <p className={!n.is_read ? 'font-medium' : 'text-gray-600'}>{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
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
