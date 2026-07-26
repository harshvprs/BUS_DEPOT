import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export default function MyShifts() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(getMonday(new Date()).toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchShifts = async () => {
      try {
        const endDate = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data } = await supabase
          .from('shifts')
          .select('*, routes(route_name, route_code)')
          .eq('employee_id', user.id)
          .gte('date', weekStart)
          .lte('date', endDate);
          
        setShifts((data || []).map(s => ({
          ...s,
          route_name: s.routes?.route_name,
          route_code: s.routes?.route_code
        })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchShifts();
  }, [weekStart, user]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(new Date(weekStart).getTime() + i * 24 * 60 * 60 * 1000);
    return { date: d.toISOString().split('T')[0], dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }), dayNum: d.getDate(), month: d.toLocaleDateString('en-IN', { month: 'short' }) };
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays size={22} className="text-amber-400" /> My Shifts
        </h1>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
        <button onClick={() => setWeekStart(new Date(new Date(weekStart).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
          className="p-1.5 rounded-lg hover:bg-white/5"><ChevronLeft size={20} /></button>
        <span className="text-sm font-semibold text-white">
          {days[0]?.month} {days[0]?.dayNum} – {days[6]?.month} {days[6]?.dayNum}
        </span>
        <button onClick={() => setWeekStart(new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
          className="p-1.5 rounded-lg hover:bg-white/5"><ChevronRight size={20} /></button>
      </div>

      {/* Day cards */}
      <div className="space-y-2">
        {days.map(d => {
          const dayShifts = shifts.filter(s => s.date === d.date);
          const isToday = d.date === today;
          const isPast = d.date < today;
          const isSunday = new Date(d.date).getDay() === 0;

          return (
            <div key={d.date} className={`rounded-xl p-4 transition-all ${
              isToday ? 'bg-white/5 border-l-4 border-l-amber-400 shadow-sm' :
              isPast ? 'bg-white/3' : 'bg-white/5'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${
                    isToday ? 'bg-amber-500 text-white' :
                    isPast ? 'bg-white/5 text-white/30' : 'bg-white/5 text-white/60'
                  }`}>
                    <span>{d.dayName}</span>
                    <span className="text-sm">{d.dayNum}</span>
                  </div>

                  {isSunday ? (
                    <div className="text-white/30 text-sm">Day Off</div>
                  ) : dayShifts.length === 0 ? (
                    <div className="text-white/30 text-sm">No shift</div>
                  ) : (
                    <div className="space-y-1">
                      {dayShifts.map((s, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                            <MapPin size={14} className="text-amber-400" />
                            {s.route_code}: {s.route_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5">
                            <Clock size={12} />
                            {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {dayShifts.length > 0 && (
                  <span className={`badge text-xs ${
                    dayShifts[0].status === 'completed' ? 'badge-present' :
                    dayShifts[0].status === 'missed' ? 'badge-absent' :
                    isPast ? 'bg-white/5 text-white/40' : 'badge-scheduled'
                  }`}>
                    {dayShifts[0].status === 'completed' ? 'Completed' :
                     dayShifts[0].status === 'missed' ? 'Missed' :
                     isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
