import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, MapPin, Clock, ArrowRight, AlertTriangle } from 'lucide-react';

export default function OpenShifts() {
  const { user } = useAuth();
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestedCovers, setRequestedCovers] = useState(new Set());

  useEffect(() => {
    if (user) loadOpenShifts();
  }, [user]);

  async function loadOpenShifts() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: shifts, error: shiftsErr } = await supabase
        .from('shifts')
        .select('*, routes(route_name, route_code)')
        .gte('date', today)
        .in('status', ['missed', 'cancelled'])
        .order('date', { ascending: true });

      if (shiftsErr) throw shiftsErr;

      const { data: myShifts } = await supabase
        .from('shifts')
        .select('date')
        .eq('employee_id', user.id)
        .gte('date', today)
        .not('status', 'in', '("cancelled","missed")');
      
      const myShiftDates = new Set((myShifts || []).map(s => s.date));

      const { data: myLeaves } = await supabase
        .from('leave_requests')
        .select('start_date, end_date')
        .eq('employee_id', user.id)
        .eq('status', 'approved')
        .gte('end_date', today);
      
      const isDateOnLeave = (dateStr) => {
        return (myLeaves || []).some(l => dateStr >= l.start_date && dateStr <= l.end_date);
      };

      const { data: myCovers } = await supabase
        .from('shift_covers')
        .select('shift_id')
        .eq('requesting_employee_id', user.id);
        
      setRequestedCovers(new Set((myCovers || []).map(c => c.shift_id)));

      const availableShifts = (shifts || []).filter(s => {
        return !myShiftDates.has(s.date) && !isDateOnLeave(s.date);
      });

      setOpenShifts(availableShifts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function offerToCover(shiftId) {
    if (!confirm('Are you sure you want to offer to cover this shift? If approved, it will be added to your schedule.')) return;
    
    try {
      const { error } = await supabase
        .from('shift_covers')
        .insert({
          shift_id: shiftId,
          requesting_employee_id: user.id,
          status: 'pending'
        });
        
      if (error) {
        if (error.code === '23505') alert('You have already offered to cover this shift.');
        else throw error;
      } else {
        alert('Offer submitted successfully! You will be notified if approved.');
        setRequestedCovers(prev => new Set([...prev, shiftId]));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit offer.');
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const urgentShifts = openShifts.filter(s => s.date === today || s.date === tomorrow);

  return (
    <div className="p-4 space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-2">
        <Briefcase size={22} className="text-amber-400" />
        <h1 className="text-xl font-bold text-white">Open Shifts</h1>
      </div>

      <p className="text-sm text-white/40">
        These shifts need coverage. Only shifts on days you are completely free are shown.
      </p>

      {/* SOS Urgent Banner */}
      {urgentShifts.length > 0 && (
        <div className="card glow-danger" style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-400" />
            <h3 className="font-bold text-red-300 text-sm">🚨 SOS — Urgent Coverage Needed!</h3>
          </div>
          <p className="text-red-200/60 text-xs">
            {urgentShifts.length} shift(s) need coverage for today or tomorrow. Quick action needed!
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-white/20">Loading open shifts...</div>
      ) : openShifts.length === 0 ? (
        <div className="card text-center p-8 text-white/30">
          <p>No open shifts available for your free days right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {openShifts.map(shift => {
            const isRequested = requestedCovers.has(shift.id);
            const isUrgent = shift.date === today || shift.date === tomorrow;
            return (
              <div key={shift.id} className={`card p-4 relative overflow-hidden ${isUrgent ? 'glow-danger' : ''}`}
                style={isUrgent ? { borderColor: 'rgba(239,68,68,0.3)' } : {}}>
                {isUrgent && <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-bold rounded-bl-lg" style={{ background: 'rgba(239,68,68,0.3)', color: '#FCA5A5' }}>URGENT</div>}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white">
                      {shift.routes?.route_code}: {shift.routes?.route_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-amber-400" />
                        <span>{new Date(shift.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-400" />
                        <span>{shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isRequested ? (
                    <span className="badge badge-scheduled text-xs">Pending</span>
                  ) : (
                    <button 
                      onClick={() => offerToCover(shift.id)}
                      className="btn btn-primary py-1.5 px-3 text-sm flex items-center gap-1"
                    >
                      Offer <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
