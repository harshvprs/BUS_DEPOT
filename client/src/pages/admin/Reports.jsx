import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { FileBarChart, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Reports() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [empData, setEmpData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, name, employee_id').eq('role', 'employee');
      const { data: attendance } = await supabase.from('attendance')
        .select('employee_id, status, date')
        .gte('date', from)
        .lte('date', to);
        
      const empStats = (profiles || []).map(p => {
        const pAtts = attendance?.filter(a => a.employee_id === p.id) || [];
        const present = pAtts.filter(a => a.status === 'present').length;
        const late = pAtts.filter(a => a.status === 'late').length;
        const absent = pAtts.filter(a => a.status === 'absent').length;
        const total = present + late + absent;
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        
        return {
          name: p.name,
          employee_id: p.employee_id,
          present, late, absent, total, percentage
        };
      });
      setEmpData(empStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCSV(type) {
    if (type === 'attendance') {
      let csv = 'Employee,ID,Present,Late,Absent,Total,Percentage\n';
      empData.forEach(d => {
        csv += `"${d.name}","${d.employee_id}",${d.present},${d.late},${d.absent},${d.total},${d.percentage}%\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${from}_${to}.csv`;
      a.click();
    } else if (type === 'leave') {
      try {
        const { data: leaves, error } = await supabase
          .from('leave_requests')
          .select('*, profiles!employee_id(name, employee_id)')
          .gte('start_date', from)
          .lte('end_date', to);
          
        if (error) throw error;
        
        let csv = 'Employee,Employee ID,Leave Type,Start Date,End Date,Status,Reason,Admin Comment\n';
        leaves.forEach(l => {
          const empName = l.profiles?.name || 'Unknown';
          const empId = l.profiles?.employee_id || 'Unknown';
          const reason = (l.reason || '').replace(/"/g, '""');
          const comment = (l.admin_comment || '').replace(/"/g, '""');
          csv += `"${empName}","${empId}","${l.leave_type}","${l.start_date}","${l.end_date}","${l.status}","${reason}","${comment}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leave_report_${from}_${to}.csv`;
        a.click();
      } catch (err) {
        console.error(err);
        alert('Failed to download leave report.');
      }
    }
  }

  const summaryStats = empData.length > 0 ? {
    avgAttendance: Math.round(empData.reduce((a, d) => a + d.percentage, 0) / empData.length),
    totalLeaves: empData.reduce((a, d) => a + parseInt(d.absent || 0), 0),
    lateCheckins: empData.reduce((a, d) => a + parseInt(d.late || 0), 0),
    perfectAttendance: empData.filter(d => d.percentage === 100).length,
  } : {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <FileBarChart size={24} className="text-white" />
        <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => downloadCSV('attendance')} className="btn btn-ghost text-sm">
            <Download size={14} /> Attendance CSV
          </button>
          <button onClick={() => downloadCSV('leave')} className="btn btn-ghost text-sm">
            <Download size={14} /> Leave CSV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {empData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Avg Attendance', value: `${summaryStats.avgAttendance}%`, color: 'text-white' },
            { label: 'Total Absences', value: summaryStats.totalLeaves, color: 'text-red-400' },
            { label: 'Late Check-ins', value: summaryStats.lateCheckins, color: 'text-amber-400' },
            { label: 'Perfect Attendance', value: `${summaryStats.perfectAttendance} employees`, color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Attendance table */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Attendance Summary</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID</th>
                <th className="text-center">Present</th>
                <th className="text-center">Late</th>
                <th className="text-center">Absent</th>
                <th className="text-center">Total</th>
                <th className="text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {empData.map((d, i) => (
                <tr key={i}>
                  <td className="font-medium text-white">{d.name}</td>
                  <td className="font-mono text-sm text-white/40">{d.employee_id}</td>
                  <td className="text-center text-emerald-400 font-medium">{d.present}</td>
                  <td className="text-center text-amber-400 font-medium">{d.late}</td>
                  <td className="text-center text-red-400 font-medium">{d.absent}</td>
                  <td className="text-center text-white/40">{d.total}</td>
                  <td className="text-center">
                    <span className={`font-bold ${
                      d.percentage >= 90 ? 'text-emerald-400' : d.percentage >= 75 ? 'text-amber-400' : 'text-red-400'
                    }`}>{d.percentage}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      {empData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Attendance by Employee</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, empData.length * 35)}>
            <BarChart data={empData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="percentage" name="Attendance %" radius={[0, 4, 4, 0]} barSize={18}>
                {empData.map((d, i) => (
                  <Cell key={i} fill={d.percentage >= 90 ? '#10B981' : d.percentage >= 75 ? '#F5A623' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
