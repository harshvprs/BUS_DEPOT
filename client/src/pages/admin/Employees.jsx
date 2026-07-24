import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Users, Plus, Search, X, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', employee_id: '', phone: '', password: '' });
  const [routes, setRoutes] = useState([]);
  const [showRoutes, setShowRoutes] = useState(false);
  const [routeForm, setRouteForm] = useState({ route_name: '', route_code: '', required_staff_count: 2 });

  useEffect(() => { load(); loadRoutes(); }, []);
  useEffect(() => { load(); }, [search]);

  async function load() {
    try {
      let query = supabase.from('profiles').select('*').eq('role', 'employee');
      if (search) {
        query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%`);
      }
      const { data } = await query;
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadRoutes() {
    try {
      const { data } = await supabase.from('routes').select('*');
      setRoutes(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await supabase.from('profiles').update({ name: form.name, phone: form.phone }).eq('id', editing.id);
      } else {
        // Create auth user (might auto-login, but for demo we proceed)
        const email = `${form.employee_id.toLowerCase()}@busdepot.com`;
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password: form.password
        });
        if (authErr) throw authErr;
        
        await supabase.from('profiles').insert({
          id: authData.user.id,
          name: form.name,
          employee_id: form.employee_id,
          phone: form.phone,
          role: 'employee'
        });
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', employee_id: '', phone: '', password: '' });
      load();
    } catch (err) {
      alert(err.message || 'Failed to save employee');
    }
  }

  async function toggleActive(emp) {
    await supabase.from('profiles').update({ is_active: !emp.is_active }).eq('id', emp.id);
    load();
  }

  function openEdit(emp) {
    setEditing(emp);
    setForm({ name: emp.name, employee_id: emp.employee_id, phone: emp.phone || '', password: '' });
    setShowModal(true);
  }

  async function handleRouteSubmit(e) {
    e.preventDefault();
    try {
      await supabase.from('routes').insert(routeForm);
      setRouteForm({ route_name: '', route_code: '', required_staff_count: 2 });
      loadRoutes();
    } catch (err) {
      alert(err.message || 'Failed to save route');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-navy-900" />
          <h1 className="text-2xl font-bold text-navy-900">
            {showRoutes ? 'Route Management' : 'Employee Management'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRoutes(false)}
            className={`btn ${!showRoutes ? 'btn-secondary' : 'btn-ghost'}`}>Employees</button>
          <button onClick={() => setShowRoutes(true)}
            className={`btn ${showRoutes ? 'btn-secondary' : 'btn-ghost'}`}>Routes</button>
          {!showRoutes && (
            <button onClick={() => { setEditing(null); setForm({ name: '', employee_id: '', phone: '', password: '' }); setShowModal(true); }}
              className="btn btn-primary"><Plus size={16} /> Add Employee</button>
          )}
        </div>
      </div>

      {!showRoutes ? (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input pl-10" placeholder="Search by name or ID..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Employee table */}
          <div className="table-container bg-white">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Current Route</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No employees found</td></tr>
                ) : employees.map(emp => (
                  <tr key={emp.id}>
                    <td className="font-mono text-sm font-medium">{emp.employee_id}</td>
                    <td className="font-medium text-navy-900">{emp.name}</td>
                    <td className="text-gray-500">{emp.phone || '—'}</td>
                    <td className="text-gray-500 text-sm">{emp.current_route || '—'}</td>
                    <td>
                      <span className={`badge ${emp.is_active ? 'badge-present' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit">
                          <Edit2 size={15} className="text-gray-500" />
                        </button>
                        <button onClick={() => toggleActive(emp)} className="p-1.5 rounded-lg hover:bg-gray-100"
                          title={emp.is_active ? 'Deactivate' : 'Activate'}>
                          {emp.is_active
                            ? <ToggleRight size={18} className="text-success-500" />
                            : <ToggleLeft size={18} className="text-gray-400" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-400">Showing {employees.length} employees</p>
        </>
      ) : (
        /* Routes management */
        <div className="space-y-4">
          <form onSubmit={handleRouteSubmit} className="card flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Route Name</label>
              <input className="input" placeholder="e.g. Majestic – Electronic City" required
                value={routeForm.route_name} onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })} />
            </div>
            <div className="w-32">
              <label className="label">Code</label>
              <input className="input" placeholder="e.g. 500D"
                value={routeForm.route_code} onChange={e => setRouteForm({ ...routeForm, route_code: e.target.value })} />
            </div>
            <div className="w-32">
              <label className="label">Staff Needed</label>
              <input type="number" className="input" min="1" max="10"
                value={routeForm.required_staff_count} onChange={e => setRouteForm({ ...routeForm, required_staff_count: parseInt(e.target.value) })} />
            </div>
            <button type="submit" className="btn btn-primary"><Plus size={16} /> Add Route</button>
          </form>

          <div className="table-container bg-white">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Route Name</th><th>Required Staff</th></tr></thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono font-medium">{r.route_code}</td>
                    <td className="font-medium text-navy-900">{r.route_name}</td>
                    <td>{r.required_staff_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-lg text-navy-900">{editing ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              {!editing && (
                <div>
                  <label className="label">Employee ID</label>
                  <input className="input font-mono" required placeholder="EMP016"
                    value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
                </div>
              )}
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              {!editing && (
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">{editing ? 'Save Changes' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
