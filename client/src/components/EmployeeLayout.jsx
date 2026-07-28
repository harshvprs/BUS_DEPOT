import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

import { supabase } from '../supabase';
import { Home, CalendarDays, FileText, Bell, LogOut, Settings as SettingsIcon, Briefcase } from 'lucide-react';

const tabs = [
  { to: '/employee/home', icon: Home, label: 'Home' },
  { to: '/employee/shifts', icon: CalendarDays, label: 'Shifts' },
  { to: '/employee/openshifts', icon: Briefcase, label: 'Open' },
  { to: '/employee/leave', icon: FileText, label: 'Leave' },
  { to: '/employee/notifications', icon: Bell, label: 'Alerts' },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
    <div className="flex flex-col h-screen max-w-md mx-auto relative">
      {/* Background orbs */}
      <div className="glass-orb w-64 h-64 bg-amber-500 -top-32 -right-32 fixed" />
      <div className="glass-orb w-48 h-48 bg-blue-500 bottom-20 -left-24 fixed" />

      {/* Top header — frosted dark glass */}
      <header className="glass-dark text-white px-4 py-3 flex items-center justify-between shrink-0 safe-top border-b border-white/8 relative z-10" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md flex items-center justify-center shadow-md">
            <span className="text-navy-900 font-bold text-xs">DF</span>
          </div>
          <span className="font-semibold text-sm">DepotFlow</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/employee/settings')}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
            <SettingsIcon size={18} className="text-white/50" />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
            <LogOut size={18} className="text-white/50" />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto pb-20 relative z-10">
        <div key={location.pathname} className="animate-fade-in w-full h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar — frosted glass */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-dark flex safe-bottom z-40 border-t border-white/8" style={{ borderRadius: '20px 20px 0 0' }}>
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-all relative ${
                isActive ? 'text-amber-400' : 'text-white/35'
              }`
            }>
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-amber-500 rounded-b shadow-[0_0_8px_rgba(245,166,35,0.5)]" />}
                <div className="relative">
                  <Icon size={20} />
                  {label === 'Alerts' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md">
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
