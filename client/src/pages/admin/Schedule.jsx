import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { CalendarClock, ChevronLeft, ChevronRight, Wand2, Upload, X, AlertTriangle } from 'lucide-react';

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()).toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showAssign, setShowAssign] = useState(null); // { route_id, date }
  const [assignEmp, setAssignEmp] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [coverRequests, setCoverRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignVehicle, setAssignVehicle] = useState('');

  useEffect(() => { load(); }, [weekStart]);

  async function load() {
    try {
      const endOfWeek = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [shiftsRes, routesRes, empRes, leavesRes, coversRes, vehiclesRes] = await Promise.all([
        supabase.from('shifts').select('*, profiles(name)').gte('date', weekStart).lte('date', endOfWeek),
        supabase.from('routes').select('*'),
        supabase.from('profiles').select('*').eq('role', 'employee'),
        supabase.from('leave_requests').select('*').eq('status', 'approved').lte('start_date', endOfWeek).gte('end_date', weekStart),
        supabase.from('shift_covers').select('*, shifts(date, start_time, end_time, routes(route_code)), profiles!requesting_employee_id(name)').eq('status', 'pending'),
        supabase.from('vehicles').select('*').eq('status', 'active')
      ]);
      
      const mappedShifts = (shiftsRes.data || []).map(s => ({
        ...s,
        employee_name: s.profiles?.name
      }));
      
      setShifts(mappedShifts);
      setRoutes(routesRes.data || []);
      setEmployees(empRes.data || []);
      setLeaves(leavesRes.data || []);
      setCoverRequests(coversRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setSuggestions([]);
    } catch (err) {
      console.error(err);
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(new Date(weekStart).getTime() + i * 24 * 60 * 60 * 1000);
    return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate() };
  });

  function getCell(routeId, date) {
    const suggested = suggestions.filter(s => s.route_id === routeId && s.date === date);
    const assigned = shifts.filter(s => s.route_id === routeId && s.date === date && s.status !== 'missed' && s.status !== 'cancelled');
    const hasMissed = shifts.some(s => s.route_id === routeId && s.date === date && (s.status === 'missed' || s.status === 'cancelled'));
    return { assigned, suggested, hasMissed };
  }

  function autoSuggest() {
    const newSuggestions = [];
    
    // Basic mock algorithm for UI demo
    for (const route of routes) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(new Date(weekStart).getTime() + i * 24 * 60 * 60 * 1000);
        if (d.getDay() === 0) continue; // Sunday
        const dateStr = d.toISOString().split('T')[0];
        
        const assignedCount = shifts.filter(s => s.route_id === route.id && s.date === dateStr && s.status !== 'missed' && s.status !== 'cancelled').length;
        let needed = route.required_staff_count - assignedCount;
        
        if (needed > 0) {
          // find employees not assigned on this day and not on leave
          const available = employees.filter(emp => 
            emp.is_active !== false && 
            !shifts.find(s => s.employee_id === emp.id && s.date === dateStr && s.status !== 'missed' && s.status !== 'cancelled') && 
            !newSuggestions.find(s => s.employee_id === emp.id && s.date === dateStr) &&
            !leaves.find(l => l.employee_id === emp.id && l.start_date <= dateStr && l.end_date >= dateStr)
          );
          for (let j = 0; j < needed && j < available.length; j++) {
            newSuggestions.push({
              route_id: route.id,
              employee_id: available[j].id,
              employee_name: available[j].name,
              date: dateStr,
              start_time: '06:00',
              end_time: '14:00'
            });
          }
        }
      }
    }
    setSuggestions(newSuggestions);
  }

  async function publish() {
    if (suggestions.length === 0) return alert('Nothing to publish. Run Auto-Suggest first.');
    const toPublish = suggestions.map(s => ({
      route_id: s.route_id, employee_id: s.employee_id,
      date: s.date, start_time: s.start_time, end_time: s.end_time,
    }));
    try {
      const { error } = await supabase.from('shifts').insert(toPublish);
      if (error) throw error;
      alert('Schedule published successfully');
      load();
    } catch (err) {
      alert(err.message || 'Failed to publish');
    }
  }

  async function assignShift() {
    if (!showAssign || !assignEmp || !assignVehicle) return;
    try {
      const { error } = await supabase.from('shifts').insert({
        route_id: showAssign.route_id, 
        employee_id: assignEmp,
        vehicle_id: assignVehicle,
        date: showAssign.date, 
        start_time: '06:00', 
        end_time: '14:00',
      });
      if (error) throw error;
      setShowAssign(null);
      setAssignEmp('');
      setAssignVehicle('');
      load();
    } catch (err) {
      alert(err.message || 'Assignment failed');
    }
  }

  function prevWeek() {
    const d = new Date(new Date(weekStart).getTime() - 7 * 24 * 60 * 60 * 1000);
    setWeekStart(d.toISOString().split('T')[0]);
  }
  function nextWeek() {
    const d = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000);
    setWeekStart(d.toISOString().split('T')[0]);
  }

  async function handleCoverRequest(cover, action) {
    try {
      if (action === 'approve') {
        // Update shift
        const { error: shiftErr } = await supabase.from('shifts')
          .update({ employee_id: cover.requesting_employee_id, status: 'scheduled' })
          .eq('id', cover.shift_id);
        if (shiftErr) throw shiftErr;
        
        // Update cover request
        await supabase.from('shift_covers').update({ status: 'approved' }).eq('id', cover.id);
        
        // Notify employee
        await supabase.from('notifications').insert({
          user_id: cover.requesting_employee_id,
          message: `Your offer to cover a shift on ${formatDate(cover.shifts.date)} has been approved!`
        });
      } else {
        await supabase.from('shift_covers').update({ status: 'rejected' }).eq('id', cover.id);
      }
      load();
    } catch (err) {
      alert('Failed to process cover request');
      console.error(err);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CalendarClock size={24} className="text-white" />
          <h1 className="text-2xl font-bold text-white">Weekly Schedule</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={autoSuggest} className="btn btn-outline text-sm">
            <Wand2 size={16} /> Auto-Suggest
          </button>
          <button onClick={publish} className="btn btn-primary text-sm" disabled={suggestions.length === 0}>
            <Upload size={16} /> Publish Schedule
          </button>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-4">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-white/5"><ChevronLeft size={20} /></button>
        <span className="font-semibold text-white">
          {formatDate(weekStart)} – {formatDate(days[6]?.date)}
        </span>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-white/5"><ChevronRight size={20} /></button>
      </div>

      {coverRequests.length > 0 && (
        <div className="card border-l-4 border-amber-500">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Pending Cover Requests
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {coverRequests.map(req => (
              <div key={req.id} className="bg-white/3 rounded-lg p-3 flex justify-between items-center border border-white/8">
                <div>
                  <div className="font-medium text-white">{req.profiles?.name}</div>
                  <div className="text-xs text-white/40 mt-1">
                    Offered to cover: <strong>{req.shifts?.routes?.route_code}</strong> on {formatDate(req.shifts?.date)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleCoverRequest(req, 'reject')} className="btn bg-white/8 hover:bg-white/12 text-white/60 py-1 px-3 text-xs">Reject</button>
                  <button onClick={() => handleCoverRequest(req, 'approve')} className="btn btn-primary py-1 px-3 text-xs">Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-300">
          ✨ {suggestions.length} suggested assignments shown in amber. Click "Publish" to save them.
        </div>
      )}

      {/* Schedule grid */}
      <div className="table-container bg-white/5 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-white/80 text-xs uppercase w-48">Route</th>
              {days.map(d => (
                <th key={d.date} className="px-2 py-3 text-center font-semibold text-white/80 text-xs uppercase">
                  <div>{d.label}</div>
                  <div className="text-navy-500 font-normal">{d.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map(route => (
              <tr key={route.id} className="border-t border-white/5">
                <td className="px-3 py-3">
                  <div className="font-medium text-white">{route.route_code}</div>
                  <div className="text-xs text-white/30 truncate max-w-[160px]">{route.route_name}</div>
                  <div className="text-xs text-white/30">Need: {route.required_staff_count}</div>
                </td>
                {days.map(d => {
                  const { assigned, suggested, hasMissed } = getCell(route.id, d.date);
                  const isSunday = new Date(d.date).getDay() === 0;
                  return (
                    <td key={d.date} className={`px-2 py-2 text-center align-top ${isSunday ? 'bg-white/3' : ''}`}>
                      {isSunday ? (
                        <span className="text-xs text-gray-300">OFF</span>
                      ) : (
                        <div className="space-y-1 min-h-[40px]">
                          {assigned.map((s, i) => (
                            <div key={i} className="bg-success-50 text-emerald-300 text-xs px-2 py-1 rounded font-medium truncate">
                              {s.employee_name?.split(' ')[0] || s.emp_code}
                            </div>
                          ))}
                          {suggested.map((s, i) => (
                            <div key={`s${i}`} className="bg-amber-100 text-amber-400 text-xs px-2 py-1 rounded font-medium truncate border border-amber-200 border-dashed">
                              {s.employee_name?.split(' ')[0]}
                            </div>
                          ))}
                          {assigned.length + suggested.length < route.required_staff_count && (
                            <button onClick={() => { setShowAssign({ route_id: route.id, date: d.date }); setAssignEmp(''); setAssignVehicle(''); }}
                              className={`w-full py-1 border border-dashed rounded text-xs transition-colors ${hasMissed ? 'border-danger-300 text-red-400 bg-danger-50 hover:border-danger-400 hover:bg-danger-100' : 'border-gray-300 text-white/30 hover:border-amber-400 hover:text-amber-500'}`}>
                              {hasMissed ? <span className="flex items-center justify-center gap-1 font-medium"><AlertTriangle size={12}/> Cover</span> : '+'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssign(null)}>
          <div className="glass-card w-full max-w-sm animate-slide-up p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Assign Shift</h3>
              <button onClick={() => setShowAssign(null)}><X size={20} className="text-white/30" /></button>
            </div>
            <p className="text-sm text-white/40 mb-3">
              {routes.find(r => r.id === showAssign.route_id)?.route_code} · {formatDate(showAssign.date)}
            </p>
            <select className="input mb-4" value={assignEmp} onChange={e => setAssignEmp(e.target.value)}>
              <option value="">Select employee...</option>
              {employees.filter(e => {
                if (!e.is_active) return false;
                const hasShift = shifts.some(s => s.employee_id === e.id && s.date === showAssign.date && s.status !== 'missed' && s.status !== 'cancelled');
                if (hasShift) return false;
                const onLeave = leaves.some(l => l.employee_id === e.id && l.start_date <= showAssign.date && l.end_date >= showAssign.date);
                if (onLeave) return false;
                return true;
              }).map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.employee_id})</option>
              ))}
            </select>
            <select className="input mb-4" value={assignVehicle} onChange={e => setAssignVehicle(e.target.value)}>
              <option value="">Select vehicle...</option>
              {vehicles.filter(v => {
                // Ensure vehicle is not already assigned to a shift on this date
                const hasShift = shifts.some(s => s.vehicle_id === v.id && s.date === showAssign.date && s.status !== 'missed' && s.status !== 'cancelled');
                return !hasShift;
              }).map(v => (
                <option key={v.id} value={v.id}>{v.bus_number} ({v.capacity} seats)</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowAssign(null)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={assignShift} className="btn btn-primary flex-1" disabled={!assignEmp || !assignVehicle}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
