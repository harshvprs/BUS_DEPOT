import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { CalendarClock, ChevronLeft, ChevronRight, Wand2, Upload, X } from 'lucide-react';

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

  useEffect(() => { load(); }, [weekStart]);

  async function load() {
    try {
      const endOfWeek = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [shiftsRes, routesRes, empRes] = await Promise.all([
        supabase.from('shifts').select('*, profiles(name)').gte('date', weekStart).lte('date', endOfWeek),
        supabase.from('routes').select('*'),
        supabase.from('profiles').select('*').eq('role', 'employee'),
      ]);
      
      const mappedShifts = (shiftsRes.data || []).map(s => ({
        ...s,
        employee_name: s.profiles?.name
      }));
      
      setShifts(mappedShifts);
      setRoutes(routesRes.data || []);
      setEmployees(empRes.data || []);
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
    const assigned = shifts.filter(s => s.route_id === routeId && s.date === date);
    return { assigned, suggested };
  }

  function autoSuggest() {
    const newSuggestions = [];
    
    // Basic mock algorithm for UI demo
    for (const route of routes) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(new Date(weekStart).getTime() + i * 24 * 60 * 60 * 1000);
        if (d.getDay() === 0) continue; // Sunday
        const dateStr = d.toISOString().split('T')[0];
        
        const assignedCount = shifts.filter(s => s.route_id === route.id && s.date === dateStr).length;
        let needed = route.required_staff_count - assignedCount;
        
        if (needed > 0) {
          // find employees not assigned on this day
          const available = employees.filter(emp => emp.is_active !== false && !shifts.find(s => s.employee_id === emp.id && s.date === dateStr) && !newSuggestions.find(s => s.employee_id === emp.id && s.date === dateStr));
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
    if (!showAssign || !assignEmp) return;
    try {
      const { error } = await supabase.from('shifts').insert({
        route_id: showAssign.route_id, employee_id: assignEmp,
        date: showAssign.date, start_time: '06:00', end_time: '14:00',
      });
      if (error) throw error;
      setShowAssign(null);
      setAssignEmp('');
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CalendarClock size={24} className="text-navy-900" />
          <h1 className="text-2xl font-bold text-navy-900">Weekly Schedule</h1>
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
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></button>
        <span className="font-semibold text-navy-900">
          {formatDate(weekStart)} – {formatDate(days[6]?.date)}
        </span>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={20} /></button>
      </div>

      {suggestions.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          ✨ {suggestions.length} suggested assignments shown in amber. Click "Publish" to save them.
        </div>
      )}

      {/* Schedule grid */}
      <div className="table-container bg-white overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-navy-800 text-xs uppercase w-48">Route</th>
              {days.map(d => (
                <th key={d.date} className="px-2 py-3 text-center font-semibold text-navy-800 text-xs uppercase">
                  <div>{d.label}</div>
                  <div className="text-navy-500 font-normal">{d.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map(route => (
              <tr key={route.id} className="border-t border-gray-50">
                <td className="px-3 py-3">
                  <div className="font-medium text-navy-900">{route.route_code}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[160px]">{route.route_name}</div>
                  <div className="text-xs text-gray-400">Need: {route.required_staff_count}</div>
                </td>
                {days.map(d => {
                  const { assigned, suggested } = getCell(route.id, d.date);
                  const isSunday = new Date(d.date).getDay() === 0;
                  return (
                    <td key={d.date} className={`px-2 py-2 text-center align-top ${isSunday ? 'bg-gray-50' : ''}`}>
                      {isSunday ? (
                        <span className="text-xs text-gray-300">OFF</span>
                      ) : (
                        <div className="space-y-1 min-h-[40px]">
                          {assigned.map((s, i) => (
                            <div key={i} className="bg-success-50 text-success-700 text-xs px-2 py-1 rounded font-medium truncate">
                              {s.employee_name?.split(' ')[0] || s.emp_code}
                            </div>
                          ))}
                          {suggested.map((s, i) => (
                            <div key={`s${i}`} className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-medium truncate border border-amber-200 border-dashed">
                              {s.employee_name?.split(' ')[0]}
                            </div>
                          ))}
                          {assigned.length + suggested.length < route.required_staff_count && (
                            <button onClick={() => { setShowAssign({ route_id: route.id, date: d.date }); setAssignEmp(''); }}
                              className="w-full py-1 border border-dashed border-gray-300 rounded text-gray-400 text-xs hover:border-amber-400 hover:text-amber-500 transition-colors">
                              +
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssign(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-slide-up p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy-900">Assign Shift</h3>
              <button onClick={() => setShowAssign(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {routes.find(r => r.id === showAssign.route_id)?.route_code} · {formatDate(showAssign.date)}
            </p>
            <select className="input mb-4" value={assignEmp} onChange={e => setAssignEmp(e.target.value)}>
              <option value="">Select employee...</option>
              {employees.filter(e => e.is_active).map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.employee_id})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowAssign(null)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={assignShift} className="btn btn-primary flex-1" disabled={!assignEmp}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
