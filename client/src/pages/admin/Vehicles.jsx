import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Bus, Plus, X, Wrench, CheckCircle2, XCircle } from 'lucide-react';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [busNumber, setBusNumber] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    setVehicles(data || []);
  }

  async function addVehicle(e) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('vehicles').insert({
        bus_number: busNumber,
        capacity: parseInt(capacity) || 40
      });
      if (error) throw error;
      setShowAdd(false);
      setBusNumber('');
      setCapacity('40');
      load();
    } catch (err) {
      alert(err.message || 'Failed to add vehicle');
    }
  }

  async function toggleStatus(id, currentStatus) {
    const next = currentStatus === 'active' ? 'maintenance' : currentStatus === 'maintenance' ? 'retired' : 'active';
    await supabase.from('vehicles').update({ status: next }).eq('id', id);
    load();
  }

  const filtered = filter === 'all' ? vehicles : vehicles.filter(v => v.status === filter);
  const counts = {
    all: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    retired: vehicles.filter(v => v.status === 'retired').length,
  };

  const statusIcon = (s) => {
    if (s === 'active') return <CheckCircle2 size={16} className="text-emerald-400" />;
    if (s === 'maintenance') return <Wrench size={16} className="text-amber-400" />;
    return <XCircle size={16} className="text-red-400" />;
  };

  const statusBadge = (s) => {
    if (s === 'active') return 'badge-present';
    if (s === 'maintenance') return 'badge-late';
    return 'badge-absent';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Bus size={24} className="text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fleet', value: counts.all, gradient: 'from-blue-500/20 to-indigo-500/20' },
          { label: 'Active', value: counts.active, gradient: 'from-emerald-500/20 to-green-500/20' },
          { label: 'Maintenance', value: counts.maintenance, gradient: 'from-amber-500/20 to-orange-500/20' },
          { label: 'Retired', value: counts.retired, gradient: 'from-red-500/20 to-pink-500/20' },
        ].map((c, i) => (
          <div key={i} className={`card bg-gradient-to-br ${c.gradient}`}>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-white/40 text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'active', 'maintenance', 'retired'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              filter === f ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Vehicle list */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bus Number</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Added</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-white/20 py-8">No vehicles found</td></tr>
            ) : filtered.map(v => (
              <tr key={v.id}>
                <td className="font-semibold text-white flex items-center gap-2">
                  <Bus size={16} className="text-amber-400/60" />
                  {v.bus_number}
                </td>
                <td>{v.capacity} seats</td>
                <td>
                  <span className={`badge ${statusBadge(v.status)} flex items-center gap-1 w-fit`}>
                    {statusIcon(v.status)} {v.status}
                  </span>
                </td>
                <td className="text-white/30 text-xs">{new Date(v.created_at).toLocaleDateString('en-IN')}</td>
                <td className="text-right">
                  <button onClick={() => toggleStatus(v.id, v.status)}
                    className="btn btn-ghost text-xs py-1 px-3">
                    Cycle Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="glass-card w-full max-w-sm p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Add Vehicle</h3>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="label">Bus Number</label>
                <input className="input" placeholder="e.g. KA-01-F-1234" value={busNumber} onChange={e => setBusNumber(e.target.value)} required />
              </div>
              <div>
                <label className="label">Capacity (seats)</label>
                <input type="number" className="input" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
