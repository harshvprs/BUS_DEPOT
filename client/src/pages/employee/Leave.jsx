import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { FileText, Plus, Clock, CheckCircle, XCircle, ArrowLeft, Mic } from 'lucide-react';

export default function Leave() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('history'); // history | apply
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({ leave_type: 'Casual Leave', start_date: '', end_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setForm(prev => ({ ...prev, reason: prev.reason ? `${prev.reason} ${text}` : text }));
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const fetchLeaveData = async () => {
    if (!user) return;
    try {
      const { data: leavesData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', user.id)
        .order('applied_on', { ascending: false });
        
      setLeaves(leavesData || []);

      const { count: usedLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'approved');

      setBalance({
        used: usedLeaves || 0,
        total: 12,
        remaining: 12 - (usedLeaves || 0)
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('leave_requests').insert({
        ...form,
        employee_id: user.id
      });
      if (error) throw error;
      
      setTab('history');
      setForm({ leave_type: 'Casual Leave', start_date: '', end_date: '', reason: '' });
      await fetchLeaveData();
    } catch (err) {
      alert(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  const daysRequested = form.start_date && form.end_date
    ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText size={22} className="text-amber-400" /> Leave
        </h1>
        {tab === 'history' ? (
          <button onClick={() => setTab('apply')} className="btn btn-primary text-sm">
            <Plus size={16} /> Apply
          </button>
        ) : (
          <button onClick={() => setTab('history')} className="btn btn-ghost text-sm">
            <ArrowLeft size={16} /> History
          </button>
        )}
      </div>

      {/* Balance card */}
      {balance && (
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/40">Leave Balance</span>
            <span className="text-sm font-medium text-white">{balance.remaining} of {balance.total} days</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(balance.remaining / balance.total) * 100}%` }} />
          </div>
          <p className="text-xs text-white/30 mt-1">{balance.used} days used this year</p>
        </div>
      )}

      {tab === 'apply' ? (
        /* Apply form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select className="input" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Earned Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" required value={form.start_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" required value={form.end_date}
                min={form.start_date || new Date().toISOString().split('T')[0]}
                onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>

          {daysRequested > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-300">
              Requesting <strong>{daysRequested} day{daysRequested > 1 ? 's' : ''}</strong> · Balance after: {(balance?.remaining || 0) - daysRequested} days
            </div>
          )}

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="label mb-0">Reason</label>
              <button 
                type="button" 
                onClick={startListening} 
                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                  isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                <Mic size={14} className={isListening ? 'animate-bounce' : ''} />
                {isListening ? 'Listening...' : 'Voice Typing'}
              </button>
            </div>
            <textarea className="input min-h-[80px]" placeholder="Describe your reason..."
              value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-base font-semibold">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      ) : (
        /* Leave history */
        <div className="space-y-2">
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">No leave requests yet</div>
          ) : leaves.map(l => (
            <div key={l.id} className="bg-white/5 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`badge text-xs ${
                  l.leave_type === 'Sick Leave' ? 'bg-red-50 text-red-700' :
                  l.leave_type === 'Earned Leave' ? 'bg-blue-50 text-blue-700' :
                  'bg-amber-50 text-amber-400'
                }`}>{l.leave_type}</span>
                <span className={`badge text-xs ${
                  l.status === 'pending' ? 'badge-pending' :
                  l.status === 'approved' ? 'badge-approved' : 'badge-rejected'
                }`}>
                  {l.status === 'approved' && <CheckCircle size={12} className="mr-1" />}
                  {l.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                  {l.status === 'pending' && <Clock size={12} className="mr-1" />}
                  {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-white font-medium mb-1">
                {new Date(l.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {l.start_date !== l.end_date && ` – ${new Date(l.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
              {l.reason && <p className="text-xs text-white/40">{l.reason}</p>}
              {l.admin_comment && <p className="text-xs text-white/30 mt-1 italic">Admin: {l.admin_comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
