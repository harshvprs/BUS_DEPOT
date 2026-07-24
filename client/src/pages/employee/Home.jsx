import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { MapPin, Clock, QrCode, Calendar } from 'lucide-react';

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayShift, setTodayShift] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/schedule', { params: { week: getMonday(new Date()).toISOString().split('T')[0] } }),
      api.get('/attendance/my-today'),
      api.get('/leave/balance'),
      api.get('/notifications'),
    ]).then(([sched, att, bal, notifs]) => {
      const today = new Date().toISOString().split('T')[0];
      const myToday = sched.data.shifts.find(s => s.date === today);
      setTodayShift(myToday || null);
      setAttendance(att.data);
      setLeaveBalance(bal.data);
      setNotifications(notifs.data.slice(0, 3));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCheckout() {
    try {
      await api.post('/attendance/checkout');
      const { data } = await api.get('/attendance/my-today');
      setAttendance(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Checkout failed');
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Greeting */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-navy-900">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Today's Shift Card */}
      <div className="card border-l-4 border-l-amber-500">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Today's Shift</h3>
        {todayShift ? (
          <>
            <div className="flex items-start gap-3 mb-3">
              <MapPin size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-navy-900">{todayShift.route_code}: {todayShift.route_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Clock size={18} className="text-amber-500 shrink-0" />
              <p className="text-gray-600">{todayShift.start_time?.slice(0,5)} – {todayShift.end_time?.slice(0,5)}</p>
            </div>
            <span className={`badge ${
              todayShift.status === 'completed' ? 'badge-present' :
              todayShift.status === 'missed' ? 'badge-absent' : 'badge-scheduled'
            }`}>
              {todayShift.status?.charAt(0).toUpperCase() + todayShift.status?.slice(1)}
            </span>
          </>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No shift scheduled for today</p>
            <p className="text-xs text-gray-300 mt-1">Enjoy your day off!</p>
          </div>
        )}
      </div>

      {/* Check-in / Check-out button */}
      {todayShift && (
        <div className="text-center">
          {!attendance?.check_in_time ? (
            <button onClick={() => navigate('/employee/scan')} className="w-full py-4 bg-amber-500 text-navy-900 rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/25 hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <QrCode size={24} /> Check In
            </button>
          ) : !attendance?.check_out_time ? (
            <div>
              <div className="bg-success-50 text-success-700 rounded-xl p-3 mb-3 text-sm font-medium">
                ✅ Checked in at {new Date(attendance.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {attendance.status === 'late' && <span className="text-amber-600 ml-1">(Late)</span>}
              </div>
              <button onClick={handleCheckout} className="w-full py-4 bg-navy-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-navy-800 active:scale-[0.98] transition-all">
                Check Out
              </button>
            </div>
          ) : (
            <div className="bg-success-50 text-success-700 rounded-xl p-4 text-sm font-medium">
              ✅ Shift completed · Checked out at {new Date(attendance.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-600">{leaveBalance?.remaining ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Leave Days Left</p>
          <p className="text-xs text-gray-400">{leaveBalance?.used ?? 0} of {leaveBalance?.total ?? 12} used</p>
        </div>
        <div className="card text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/employee/notifications')}>
          <p className="text-2xl font-bold text-navy-900">{notifications.filter(n => !n.is_read).length}</p>
          <p className="text-xs text-gray-500 mt-1">Unread Alerts</p>
          <p className="text-xs text-amber-500">Tap to view</p>
        </div>
      </div>

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent</h3>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`p-3 rounded-lg text-sm ${n.is_read ? 'bg-white' : 'bg-amber-50 border border-amber-100'}`}>
                <p className={n.is_read ? 'text-gray-500' : 'text-navy-900 font-medium'}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}
