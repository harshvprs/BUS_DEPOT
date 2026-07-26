import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Users, UserCheck, CalendarOff, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Heatmap component — GitHub-style attendance grid
function AttendanceHeatmap({ data }) {
  if (!data || data.length === 0) return <p className="text-white/30 text-sm text-center py-8">No attendance data to display</p>;

  const getColor = (status) => {
    if (status === 'present') return 'rgba(16, 185, 129, 0.7)';
    if (status === 'late') return 'rgba(245, 166, 35, 0.7)';
    if (status === 'absent') return 'rgba(239, 68, 68, 0.7)';
    return 'rgba(255, 255, 255, 0.04)';
  };

  // Group data by employee
  const employees = {};
  data.forEach(a => {
    if (!employees[a.employee_id]) employees[a.employee_id] = { name: a.name || 'Unknown', days: {} };
    employees[a.employee_id].days[a.date] = a.status;
  });

  // Generate last 30 days
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Date headers */}
        <div className="flex gap-[2px] mb-1 pl-28">
          {dates.filter((_, i) => i % 5 === 0).map(d => (
            <div key={d} className="text-[9px] text-white/25" style={{ width: '52px' }}>
              {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          ))}
        </div>
        {/* Employee rows */}
        {Object.entries(employees).slice(0, 15).map(([id, emp]) => (
          <div key={id} className="flex items-center gap-2 mb-[2px]">
            <span className="text-xs text-white/50 w-24 truncate text-right">{emp.name.split(' ')[0]}</span>
            <div className="flex gap-[2px]">
              {dates.map(d => (
                <div key={d} className="w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-150"
                  style={{ background: getColor(emp.days[d]) }}
                  title={`${emp.name} — ${d}: ${emp.days[d] || 'No data'}`}
                />
              ))}
            </div>
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pl-28">
          {[
            { label: 'Present', color: 'rgba(16,185,129,0.7)' },
            { label: 'Late', color: 'rgba(245,166,35,0.7)' },
            { label: 'Absent', color: 'rgba(239,68,68,0.7)' },
            { label: 'No data', color: 'rgba(255,255,255,0.04)' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: l.color }} />
              <span className="text-[10px] text-white/35">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [empAtt, setEmpAtt] = useState([]);
  const [punctuality, setPunctuality] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [routeAbsence, setRouteAbsence] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [profilesRes, attendanceRes, leavesRes, shiftsRes] = await Promise.all([
          supabase.from('profiles').select('id, name, role'),
          supabase.from('attendance').select('id, date, status, employee_id'),
          supabase.from('leave_requests').select('id').eq('status', 'approved').lte('start_date', today).gte('end_date', today),
          supabase.from('shifts').select('id, route_id, status, date, routes(route_code, route_name)').gte('date', thirtyDaysAgo).lte('date', today)
        ]);

        const profiles = profilesRes.data || [];
        const atts = attendanceRes.data || [];
        const allShifts = shiftsRes.data || [];
        
        const totalStaff = profiles.length;
        const presentToday = atts.filter(a => a.date === today && (a.status === 'present' || a.status === 'late')).length;
        const onLeave = leavesRes.data?.length || 0;
        
        // Count understaffed routes
        const understaffed = new Set();
        allShifts.filter(s => s.date === today && (s.status === 'missed' || s.status === 'cancelled')).forEach(s => {
          if (s.routes?.route_code) understaffed.add(s.routes.route_code);
        });

        setSummary({
          total_staff: totalStaff,
          present_today: presentToday,
          on_leave: onLeave,
          understaffed_routes: understaffed.size
        });

        // Attendance Trend (Last 7 days)
        const trendData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayAtts = atts.filter(a => a.date === dateStr);
          const presents = dayAtts.filter(a => a.status === 'present' || a.status === 'late').length;
          trendData.push({
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            'Attendance %': totalStaff > 0 ? Math.round((presents / totalStaff) * 100) : 0
          });
        }
        setTrend(trendData);

        // Employee Attendance %
        const empStats = profiles.slice(0, 10).map(p => {
          const eAtts = atts.filter(a => a.employee_id === p.id);
          const presents = eAtts.filter(a => a.status === 'present' || a.status === 'late').length;
          return {
            name: p.name.split(' ')[0],
            fullName: p.name,
            'Attendance %': eAtts.length > 0 ? Math.round((presents / eAtts.length) * 100) : 0
          };
        });
        setEmpAtt(empStats);

        // Punctuality
        const punctualityCounts = { on_time: 0, late: 0, absent: 0 };
        atts.forEach(a => {
          if (a.status === 'present') punctualityCounts.on_time++;
          else if (a.status === 'late') punctualityCounts.late++;
          else if (a.status === 'absent') punctualityCounts.absent++;
        });
        setPunctuality(punctualityCounts);

        // Heatmap data
        const heatmap = atts.filter(a => a.date >= thirtyDaysAgo).map(a => {
          const profile = profiles.find(p => p.id === a.employee_id);
          return { ...a, name: profile?.name || 'Unknown' };
        });
        setHeatmapData(heatmap);

        // Route absence rates
        const routeStats = {};
        allShifts.forEach(s => {
          const code = s.routes?.route_code || 'Unknown';
          if (!routeStats[code]) routeStats[code] = { total: 0, missed: 0, name: s.routes?.route_name || '' };
          routeStats[code].total++;
          if (s.status === 'missed' || s.status === 'cancelled') routeStats[code].missed++;
        });
        const routeAbsData = Object.entries(routeStats)
          .map(([code, stats]) => ({
            route: code,
            'Absence %': stats.total > 0 ? Math.round((stats.missed / stats.total) * 100) : 0,
            missed: stats.missed,
            total: stats.total
          }))
          .sort((a, b) => b['Absence %'] - a['Absence %']);
        setRouteAbsence(routeAbsData);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchDashboardData();
  }, []);

  const cards = summary ? [
    { label: 'Total Staff', value: summary.total_staff, icon: Users, gradient: 'from-blue-500/20 to-indigo-500/20', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.15)]', iconColor: 'text-blue-400' },
    { label: 'Present Today', value: summary.present_today, icon: UserCheck, gradient: 'from-emerald-500/20 to-green-500/20', glow: 'glow-success', iconColor: 'text-emerald-400' },
    { label: 'On Leave', value: summary.on_leave, icon: CalendarOff, gradient: 'from-amber-500/20 to-orange-500/20', glow: 'glow-amber', iconColor: 'text-amber-400' },
    { label: 'Understaffed Routes', value: summary.understaffed_routes, icon: AlertTriangle, gradient: summary.understaffed_routes > 0 ? 'from-red-500/20 to-pink-500/20' : 'from-white/5 to-white/5', glow: summary.understaffed_routes > 0 ? 'glow-danger' : '', iconColor: summary.understaffed_routes > 0 ? 'text-red-400' : 'text-white/30' },
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
        <TrendingUp size={24} className="text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      {/* Summary cards — glass with colored glow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className={`card bg-gradient-to-br ${c.gradient} ${c.glow} animate-slide-up`}
            style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">{c.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{c.value}</p>
              </div>
              <c.icon size={28} className={c.iconColor} style={{ opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-white mb-4">Weekly Attendance Trend</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                <Tooltip contentStyle={{ background: 'rgba(10,37,64,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E2E8F0' }} />
                <Line type="monotone" dataKey="Attendance %" stroke="#F5A623" strokeWidth={2.5} dot={{ fill: '#F5A623', r: 4, stroke: 'rgba(245,166,35,0.3)', strokeWidth: 6 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/20">Loading chart...</div>
          )}
        </div>

        {/* Punctuality Pie */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Punctuality Overview</h3>
          {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(10,37,64,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E2E8F0' }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/20">No data yet</div>
          )}
        </div>
      </div>

      {/* Attendance Heatmap */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">📊 Attendance Heatmap (Last 30 Days)</h3>
        <AttendanceHeatmap data={heatmapData} />
      </div>

      {/* Route Absence Rate */}
      {routeAbsence.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">🚌 Route Absence Rate (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, routeAbsence.length * 40)}>
            <BarChart data={routeAbsence} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis dataKey="route" type="category" width={80} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,37,64,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E2E8F0' }}
                formatter={(v, n, p) => [`${v}% (${p.payload.missed}/${p.payload.total} shifts)`, 'Absence Rate']}
              />
              <Bar dataKey="Absence %" radius={[0, 6, 6, 0]} barSize={20}>
                {routeAbsence.map((entry, i) => (
                  <Cell key={i} fill={entry['Absence %'] >= 20 ? '#EF4444' : entry['Absence %'] >= 10 ? '#F5A623' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Employee Attendance Bar Chart */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Attendance by Employee</h3>
        {empAtt.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, empAtt.length * 35)}>
            <BarChart data={empAtt} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip
                formatter={(v, n, p) => [`${v}%`, p.payload.fullName]}
                contentStyle={{ background: 'rgba(10,37,64,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E2E8F0' }}
              />
              <Bar dataKey="Attendance %" radius={[0, 6, 6, 0]} barSize={18}>
                {empAtt.map((entry, i) => (
                  <Cell key={i} fill={entry['Attendance %'] >= 90 ? '#10B981' : entry['Attendance %'] >= 75 ? '#F5A623' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-white/20">Loading...</div>
        )}
      </div>
    </div>
  );
}
