import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { QrCode, RefreshCw, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Attendance() {
  const [qrData, setQrData] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateQR = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate generating a secure QR token since Express server is gone
      const token = btoa(JSON.stringify({ 
        depot: 'Kempegowda', 
        date: new Date().toISOString().split('T')[0],
        nonce: Math.random()
      }));
      setQrData(token);
      
      const expires = new Date();
      expires.setHours(23, 59, 59, 999);
      setExpiresAt(expires);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*, profiles(name, employee_id), routes(route_code), attendance(*)')
        .eq('date', today);

      if (shifts) {
        const formatted = shifts.map(s => {
          // Find attendance for this shift/date
          const att = s.attendance?.find(a => a.date === today) || {};
          return {
            id: s.id, // shift_id
            emp_uuid: s.employee_id,
            employee_id: s.profiles?.employee_id,
            name: s.profiles?.name,
            route_code: s.routes?.route_code,
            start_time: s.start_time,
            end_time: s.end_time,
            check_in_time: att.check_in_time,
            attendance_status: att.status
          };
        });
        setLiveData(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    generateQR();
    loadLive();
    const interval = setInterval(loadLive, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [generateQR, loadLive]);

  async function markAbsent() {
    if (!confirm('Mark all unchecked-in employees as absent?')) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const missing = liveData.filter(d => !d.attendance_status);
      
      if (missing.length > 0) {
        const inserts = missing.map(m => ({
          employee_id: m.emp_uuid,
          shift_id: m.id,
          date: today,
          status: 'absent'
        }));
        await supabase.from('attendance').insert(inserts);
      }
      alert('Missing employees marked as absent.');
      loadLive();
    } catch (err) {
      alert('Error marking absent: ' + err.message);
    }
  }

  const isExpired = expiresAt && new Date() > expiresAt;

  const statusCounts = {
    present: liveData.filter(d => d.attendance_status === 'present').length,
    late: liveData.filter(d => d.attendance_status === 'late').length,
    absent: liveData.filter(d => d.attendance_status === 'absent').length,
    pending: liveData.filter(d => !d.attendance_status || d.attendance_status === null).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <QrCode size={24} className="text-navy-900" />
          <h1 className="text-2xl font-bold text-navy-900">Attendance — Live View</h1>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-dot" />
            <span className="text-success-600 text-xs font-medium">Live</span>
          </div>
        </div>
        <button onClick={markAbsent} className="btn btn-danger text-sm">
          <AlertCircle size={16} /> Mark Absent (EOD)
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* QR Code section */}
        <div className="card text-center">
          <h3 className="font-semibold text-navy-900 mb-4">Today's Check-in QR Code</h3>
          <div className={`inline-block p-4 rounded-xl border-2 ${isExpired ? 'border-danger-200 bg-danger-50' : 'border-amber-200 bg-amber-50/50'}`}>
            {qrData ? (
              <QRCodeSVG value={qrData} size={200} level="H" bgColor="transparent"
                fgColor={isExpired ? '#9CA3AF' : '#0A2540'} />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400">Generating...</div>
            )}
          </div>
          <p className={`text-sm mt-3 ${isExpired ? 'text-danger-500 font-medium' : 'text-gray-500'}`}>
            {isExpired ? 'QR Expired — regenerate below' : `Expires at ${expiresAt?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
          <button onClick={generateQR} disabled={loading} className="btn btn-outline mt-3 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Regenerate QR
          </button>
        </div>

        {/* Status summary + Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mini status cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Present', count: statusCounts.present, cls: 'text-success-600 bg-success-50' },
              { label: 'Late', count: statusCounts.late, cls: 'text-amber-700 bg-amber-50' },
              { label: 'Absent', count: statusCounts.absent, cls: 'text-danger-600 bg-danger-50' },
              { label: 'Pending', count: statusCounts.pending, cls: 'text-gray-500 bg-gray-50' },
            ].map(s => (
              <div key={s.label} className={`${s.cls} rounded-lg p-3 text-center`}>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Live table */}
          <div className="table-container bg-white">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Route</th>
                  <th>Shift</th>
                  <th>Check-in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {liveData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No shifts scheduled for today</td></tr>
                ) : liveData.map((d, i) => (
                  <tr key={i}>
                    <td className="font-mono text-sm">{d.employee_id}</td>
                    <td className="font-medium">{d.name}</td>
                    <td className="text-sm text-gray-500">{d.route_code}</td>
                    <td className="text-sm text-gray-500">{d.start_time?.slice(0,5)} – {d.end_time?.slice(0,5)}</td>
                    <td className="text-sm">
                      {d.check_in_time ? new Date(d.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${
                        d.attendance_status === 'present' ? 'badge-present' :
                        d.attendance_status === 'late' ? 'badge-late' :
                        d.attendance_status === 'absent' ? 'badge-absent' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {d.attendance_status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
