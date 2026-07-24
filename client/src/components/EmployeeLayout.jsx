import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

import { supabase } from '../supabase';
import { Home, CalendarDays, FileText, Bell, LogOut, Settings as SettingsIcon } from 'lucide-react';

const tabs = [
  { to: '/employee/home', icon: Home, label: 'Home' },
  { to: '/employee/shifts', icon: CalendarDays, label: 'Shifts' },
  { to: '/employee/leave', icon: FileText, label: 'Leave' },
  { to: '/employee/notifications', icon: Bell, label: 'Alerts' },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-surface relative">
      {/* Top header */}
      <header className="bg-navy-900 text-white px-4 py-3 flex items-center justify-between shrink-0 safe-top">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center">
            <span className="text-navy-900 font-bold text-xs">DF</span>
          </div>
          <span className="font-semibold text-sm">DepotFlow</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/employee/settings')}
            className="p-1.5 rounded-lg hover:bg-navy-800 transition-colors">
            <SettingsIcon size={18} className="text-navy-300" />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 rounded-lg hover:bg-navy-800 transition-colors">
            <LogOut size={18} className="text-navy-300" />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex safe-bottom z-40">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors relative ${
                isActive ? 'text-amber-600' : 'text-gray-400'
              }`
            }>
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-amber-500 rounded-b" />}
                <div className="relative">
                  <Icon size={20} />
                  {label === 'Alerts' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-danger-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="mt-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
