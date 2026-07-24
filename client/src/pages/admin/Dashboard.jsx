import { useState, useEffect } from 'react';
import api from '../../api';
import { Users, UserCheck, CalendarOff, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [empAtt, setEmpAtt] = useState([]);
  const [punctuality, setPunctuality] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/attendance-trend'),
      api.get('/reports/employee-attendance'),
      api.get('/reports/punctuality'),
    ]).then(([s, t, e, p]) => {
      setSummary(s.data);
      setTrend(t.data.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        'Attendance %': d.total > 0 ? Math.round(((parseInt(d.present) + parseInt(d.late)) / parseInt(d.total)) * 100) : 0,
      })));
      setEmpAtt(e.data.map(d => ({
        name: d.name.split(' ')[0],
        fullName: d.name,
        'Attendance %': d.total > 0 ? Math.round(((parseInt(d.present) + parseInt(d.late)) / parseInt(d.total)) * 100) : 0,
      })));
      setPunctuality(p.data);
    }).catch(console.error);
  }, []);

  const cards = summary ? [
    { label: 'Total Staff', value: summary.total_staff, icon: Users, color: 'bg-navy-900', textColor: 'text-white' },
    { label: 'Present Today', value: summary.present_today, icon: UserCheck, color: 'bg-success-500', textColor: 'text-white' },
    { label: 'On Leave', value: summary.on_leave, icon: CalendarOff, color: 'bg-amber-500', textColor: 'text-navy-900' },
    { label: 'Understaffed Routes', value: summary.understaffed_routes, icon: AlertTriangle, color: summary.understaffed_routes > 0 ? 'bg-danger-500' : 'bg-gray-200', textColor: summary.understaffed_routes > 0 ? 'text-white' : 'text-gray-600' },
  ] : [];

  const pieData = punctuality ? [
    { name: 'On-time', value: parseInt(punctuality.on_time) || 0 },
    { name: 'Late', value: parseInt(punctuality.late) || 0 },
    { name: 'Absent', value: parseInt(punctuality.absent) || 0 },
  ] : [];

  const pieColors = ['#10B981', '#F5A623', '#EF4444'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <TrendingUp size={24} className="text-navy-900" />
        <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className={`${c.color} ${c.textColor} rounded-xl p-5 shadow-sm animate-slide-up`}
            style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
              </div>
              <c.icon size={28} className="opacity-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-navy-900 mb-4">Monthly Attendance Trend</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Line type="monotone" dataKey="Attendance %" stroke="#0A2540" strokeWidth={2.5} dot={{ fill: '#F5A623', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">Loading chart...</div>
          )}
        </div>

        {/* Punctuality Pie */}
        <div className="card">
          <h3 className="font-semibold text-navy-900 mb-4">Punctuality Overview</h3>
          {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Employee Attendance Bar Chart */}
      <div className="card">
        <h3 className="font-semibold text-navy-900 mb-4">Attendance by Employee</h3>
        {empAtt.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, empAtt.length * 35)}>
            <BarChart data={empAtt} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n, p) => [`${v}%`, p.payload.fullName]} contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="Attendance %" radius={[0, 4, 4, 0]} fill="#0A2540" barSize={18}>
                {empAtt.map((entry, i) => (
                  <Cell key={i} fill={entry['Attendance %'] >= 90 ? '#10B981' : entry['Attendance %'] >= 75 ? '#F5A623' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400">Loading...</div>
        )}
      </div>
    </div>
  );
}
