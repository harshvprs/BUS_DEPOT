import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ClipboardList, Check, X, AlertTriangle } from 'lucide-react';

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState('');
  const [warnings, setWarnings] = useState({});

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try {
      let query = supabase
        .from('leave_requests')
        .select('*, profiles(name, employee_id)')
        .order('applied_on', { ascending: false });
        
      if (filter) query = query.eq('status', filter);
      const { data } = await query;
      
      const formatted = (data || []).map(l => ({
        ...l,
        name: l.profiles?.name,
        emp_id: l.profiles?.employee_id
      }));
      setLeaves(formatted);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAction(id, action) {
    const comment = action === 'reject' ? prompt('Rejection reason (optional):') : null;
    const status = action === 'approve' ? 'approved' : 'rejected';
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status, admin_comment: comment })
        .eq('id', id);
        
      if (error) throw error;
      load();
    } catch (err) {
      alert(err.message || 'Failed');
    }
  }

  const tabs = [
    { value: '', label: 'All', count: leaves.length },
    { value: 'pending', label: 'Pending', count: leaves.filter(l => l.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: leaves.filter(l => l.status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: leaves.filter(l => l.status === 'rejected').length },
  ];

  const filtered = filter ? leaves.filter(l => l.status === filter) : leaves;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ClipboardList size={24} className="text-navy-900" />
        <h1 className="text-2xl font-bold text-navy-900">Leave Requests</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === t.value ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Leave cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center text-gray-400 py-12">No leave requests found</div>
        ) : filtered.map(l => (
          <div key={l.id} className={`card border-l-4 ${
            l.status === 'pending' ? 'border-l-amber-500' :
            l.status === 'approved' ? 'border-l-success-500' : 'border-l-danger-500'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-navy-900">{l.name}</span>
                  <span className="text-gray-400 text-sm font-mono">{l.emp_id}</span>
                  <span className={`badge ${
                    l.leave_type === 'Sick Leave' ? 'bg-red-50 text-red-700' :
                    l.leave_type === 'Earned Leave' ? 'bg-blue-50 text-blue-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>{l.leave_type}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  📅 {new Date(l.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {l.start_date !== l.end_date && ` – ${new Date(l.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
                {l.reason && <p className="text-sm text-gray-500">"{l.reason}"</p>}
                {l.admin_comment && <p className="text-sm text-gray-400 mt-1 italic">Admin: {l.admin_comment}</p>}
                <p className="text-xs text-gray-400 mt-2">Applied {new Date(l.applied_on).toLocaleDateString('en-IN')}</p>

                {warnings[l.id]?.map((w, i) => (
                  <div key={i} className="mt-2 flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-2 text-sm">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {w}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className={`badge text-sm ${
                  l.status === 'pending' ? 'badge-pending' :
                  l.status === 'approved' ? 'badge-approved' : 'badge-rejected'
                }`}>
                  {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                </span>
                {l.status === 'pending' && (
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => handleAction(l.id, 'approve')} className="btn btn-success btn-sm text-xs py-1.5 px-3">
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => handleAction(l.id, 'reject')} className="btn btn-danger btn-sm text-xs py-1.5 px-3">
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
