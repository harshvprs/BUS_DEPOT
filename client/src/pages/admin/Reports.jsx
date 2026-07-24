import { useState, useEffect } from 'react';
import api from '../../api';
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
    const { data } = await api.get('/reports/employee-attendance', { params: { from, to } });
    setEmpData(data.map(d => ({
      ...d,
      percentage: d.total > 0 ? Math.round(((parseInt(d.present) + parseInt(d.late)) / parseInt(d.total)) * 100) : 0,
    })));
    setLoading(false);
  }

  function downloadCSV(type) {
    window.open(`/api/reports/download/${type}?from=${from}&to=${to}`, '_blank');
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
        <FileBarChart size={24} className="text-navy-900" />
        <h1 className="text-2xl font-bold text-navy-900">Reports & Analytics</h1>
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
            { label: 'Avg Attendance', value: `${summaryStats.avgAttendance}%`, color: 'text-navy-900' },
            { label: 'Total Absences', value: summaryStats.totalLeaves, color: 'text-danger-500' },
            { label: 'Late Check-ins', value: summaryStats.lateCheckins, color: 'text-amber-600' },
            { label: 'Perfect Attendance', value: `${summaryStats.perfectAttendance} employees`, color: 'text-success-600' },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Attendance table */}
      <div className="card">
        <h3 className="font-semibold text-navy-900 mb-4">Attendance Summary</h3>
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
                  <td className="font-medium text-navy-900">{d.name}</td>
                  <td className="font-mono text-sm text-gray-500">{d.employee_id}</td>
                  <td className="text-center text-success-600 font-medium">{d.present}</td>
                  <td className="text-center text-amber-600 font-medium">{d.late}</td>
                  <td className="text-center text-danger-500 font-medium">{d.absent}</td>
                  <td className="text-center text-gray-500">{d.total}</td>
                  <td className="text-center">
                    <span className={`font-bold ${
                      d.percentage >= 90 ? 'text-success-600' : d.percentage >= 75 ? 'text-amber-600' : 'text-danger-500'
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
          <h3 className="font-semibold text-navy-900 mb-4">Attendance by Employee</h3>
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
