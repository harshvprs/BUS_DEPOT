import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Users, Plus, Search, X, Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', employee_id: '', phone: '', email: '' });
  const [routes, setRoutes] = useState([]);
  const [showRoutes, setShowRoutes] = useState(false);
  const [routeForm, setRouteForm] = useState({ route_name: '', route_code: '', required_staff_count: 2 });
  const [editingRoute, setEditingRoute] = useState(null);

  useEffect(() => { load(); loadRoutes(); }, []);

  // ⚡ Bolt: Added debounce to reduce unnecessary Supabase queries while typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { load(); }, [debouncedSearch]);

  async function load() {
    try {
      let query = supabase.from('profiles').select('*').eq('role', 'employee');
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,employee_id.ilike.%${debouncedSearch}%`);
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
        const { data, error } = await supabase.functions.invoke('create-employee', {
          body: {
            email: form.email,
            name: form.name,
            employee_id: form.employee_id,
            phone: form.phone
          }
        });
        if (error) {
          let errorMessage = error.message;
          if (error.context) {
            try {
              const contextJson = await error.context.json();
              if (contextJson.error) errorMessage = contextJson.error;
            } catch (e) {}
          }
          throw new Error(errorMessage || 'Failed to invoke edge function');
        }
        if (data?.error) throw new Error(data.error);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', employee_id: '', phone: '', email: '' });
      load();
    } catch (err) {
      console.error("Full error:", err);
      alert(typeof err.message === 'object' ? JSON.stringify(err.message) : (err.message || 'Failed to save employee'));
    }
  }

  async function toggleActive(emp) {
    await supabase.from('profiles').update({ is_active: !emp.is_active }).eq('id', emp.id);
    load();
  }

  async function deleteEmployee(emp) {
    if (!window.confirm(`Are you sure you want to permanently delete ${emp.name} (${emp.employee_id})? This action cannot be undone.`)) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { employeeId: emp.id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to delete employee: ' + (err.message || 'Unknown error'));
    }
  }

  function openEdit(emp) {
    setEditing(emp);
    setForm({ name: emp.name, employee_id: emp.employee_id, phone: emp.phone || '', email: '' });
    setShowModal(true);
  }

  async function handleRouteSubmit(e) {
    e.preventDefault();
    try {
      if (editingRoute) {
        await supabase.from('routes').update(routeForm).eq('id', editingRoute.id);
        setEditingRoute(null);
      } else {
        await supabase.from('routes').insert(routeForm);
      }
      setRouteForm({ route_name: '', route_code: '', required_staff_count: 2 });
      loadRoutes();
    } catch (err) {
      alert(err.message || 'Failed to save route');
    }
  }

  async function deleteRoute(route) {
    if (!window.confirm(`Are you sure you want to delete route ${route.route_name}?`)) return;
    try {
      await supabase.from('routes').delete().eq('id', route.id);
      loadRoutes();
    } catch (err) {
      alert(err.message || 'Failed to delete route');
    }
  }

  function openEditRoute(route) {
    setEditingRoute(route);
    setRouteForm({
      route_name: route.route_name,
      route_code: route.route_code || '',
      required_staff_count: route.required_staff_count
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-white" />
          <h1 className="text-2xl font-bold text-white">
            {showRoutes ? 'Route Management' : 'Employee Management'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRoutes(false)}
            className={`btn ${!showRoutes ? 'btn-secondary' : 'btn-ghost'}`}>Employees</button>
          <button onClick={() => setShowRoutes(true)}
            className={`btn ${showRoutes ? 'btn-secondary' : 'btn-ghost'}`}>Routes</button>
          {!showRoutes && (
            <button onClick={() => { setEditing(null); setForm({ name: '', employee_id: '', phone: '', email: '' }); setShowModal(true); }}
              className="btn btn-primary"><Plus size={16} /> Add Employee</button>
          )}
        </div>
      </div>

      {!showRoutes ? (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" className="input pl-10" placeholder="Search by name or ID..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Employee table */}
          <div className="table-container">
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
                  <tr><td colSpan={6} className="text-center py-8 text-white/30">No employees found</td></tr>
                ) : employees.map(emp => (
                  <tr key={emp.id}>
                    <td className="font-mono text-sm font-medium">{emp.employee_id}</td>
                    <td className="font-medium text-white">{emp.name}</td>
                    <td className="text-white/40">{emp.phone || '—'}</td>
                    <td className="text-white/40 text-sm">{emp.current_route || '—'}</td>
                    <td>
                      <span className={`badge ${emp.is_active ? 'badge-present' : 'bg-white/5 text-white/40'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-white/5" title="Edit">
                          <Edit2 size={15} className="text-white/40" />
                        </button>
                        <button onClick={() => toggleActive(emp)} className="p-1.5 rounded-lg hover:bg-white/5"
                          title={emp.is_active ? 'Deactivate' : 'Activate'}>
                          {emp.is_active
                            ? <ToggleRight size={18} className="text-success-500" />
                            : <ToggleLeft size={18} className="text-white/30" />
                          }
                        </button>
                        <button onClick={() => deleteEmployee(emp)} className="p-1.5 rounded-lg hover:bg-danger-50 text-red-400" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/30">Showing {employees.length} employees</p>
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
            <div className="flex gap-2">
              {editingRoute && (
                <button type="button" onClick={() => { setEditingRoute(null); setRouteForm({ route_name: '', route_code: '', required_staff_count: 2 }); }} className="btn btn-ghost">Cancel</button>
              )}
              <button type="submit" className="btn btn-primary">
                {editingRoute ? <Edit2 size={16} /> : <Plus size={16} />}
                {editingRoute ? ' Update Route' : ' Add Route'}
              </button>
            </div>
          </form>

          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Route Name</th><th>Required Staff</th><th>Actions</th></tr></thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-white/30">No routes found</td></tr>
                ) : routes.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono font-medium">{r.route_code || '—'}</td>
                    <td className="font-medium text-white">{r.route_name}</td>
                    <td>{r.required_staff_count}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEditRoute(r)} className="p-1.5 rounded-lg hover:bg-white/5" title="Edit Route">
                          <Edit2 size={15} className="text-white/40" />
                        </button>
                        <button onClick={() => deleteRoute(r)} className="p-1.5 rounded-lg hover:bg-danger-50 text-red-400" title="Delete Route">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="font-semibold text-lg text-white">{editing ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/5"><X size={20} /></button>
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
                  <label className="label">Email Address</label>
                  <input className="input" type="email" required placeholder="employee@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
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
