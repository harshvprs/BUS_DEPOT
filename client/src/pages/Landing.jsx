import { Link } from 'react-router-dom';
import { Bus, QrCode, CalendarClock, FileText, CheckCircle2, Shield, BarChart3 } from 'lucide-react';

const features = [
  { icon: QrCode, title: 'QR Attendance', desc: 'Scan-to-check-in with real-time tracking and grace period detection' },
  { icon: CalendarClock, title: 'Smart Scheduling', desc: 'Auto-roster generation with constraint solving and conflict prevention' },
  { icon: FileText, title: 'Leave Management', desc: 'Apply, track, and approve leaves digitally with understaffing alerts' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Attendance trends, punctuality charts, and downloadable CSV reports' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Separate admin dashboard and employee mobile experience' },
  { icon: CheckCircle2, title: 'Real-Time Monitoring', desc: 'Live attendance view with color-coded status indicators' },
];

const stats = [
  { value: '15+', label: 'Employees Managed' },
  { value: '5', label: 'Routes Tracked' },
  { value: '95%', label: 'On-time Check-ins' },
  { value: '< 3s', label: 'QR Scan Time' },
];

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background orbs */}
      <div className="glass-orb w-[600px] h-[600px] bg-amber-500 -top-64 -right-64" />
      <div className="glass-orb w-[500px] h-[500px] bg-blue-600 top-1/2 -left-64" />
      <div className="glass-orb w-[400px] h-[400px] bg-teal-400 bottom-0 right-1/4 animate-float" />

      {/* Hero */}
      <section className="relative">
        <header className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg glow-amber">
              <Bus size={20} className="text-navy-900" />
            </div>
            <span className="text-white font-bold text-lg">DepotFlow</span>
          </div>
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        </header>

        <div className="relative z-10 px-6 lg:px-16 py-20 lg:py-32 max-w-5xl">
          <h1 className="text-white text-4xl lg:text-6xl font-bold leading-tight mb-6">
            Modernizing Bus Depot<br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">Operations</span>
          </h1>
          <p className="text-white/50 text-lg lg:text-xl max-w-2xl mb-10 leading-relaxed">
            A digital platform replacing manual paper-based staff scheduling, attendance tracking, 
            and leave management for Indian state transport bus depots.
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="btn btn-primary px-8 py-3 text-base font-semibold">
              Get Started
            </Link>
            <a href="#features" className="btn btn-secondary px-6 py-3">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 lg:px-16 -mt-8 relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card text-center animate-slide-up glow-amber" style={{ animationDelay: `${i * 0.1}s` }}>
              <p className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-white/40 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6 lg:px-16 relative z-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-white text-3xl font-bold text-center mb-3">Platform Features</h2>
          <p className="text-white/40 text-center mb-12 max-w-xl mx-auto">
            Everything a depot manager needs to digitize daily operations, built for the Indian public transport context.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="card group hover:glow-amber transition-all duration-300">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <Icon size={20} className="text-amber-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-dark text-white/40 py-8 px-6 text-center text-sm relative z-10 border-t border-white/5" style={{ borderRadius: 0 }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bus size={16} className="text-amber-400" />
          <span className="text-white font-semibold">DepotFlow</span>
        </div>
        <p>Smart Workforce & Operations Management System</p>
        <p className="mt-1 text-white/25">Smart India Hackathon 2024 · SKH050 · Transportation Domain</p>
      </footer>
    </div>
  );
}
