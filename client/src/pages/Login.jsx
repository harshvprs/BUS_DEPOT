import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await login(employeeId, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/employee/home');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating glass orbs */}
      <div className="glass-orb w-[500px] h-[500px] bg-amber-500 -top-48 -right-48" />
      <div className="glass-orb w-[400px] h-[400px] bg-blue-600 bottom-0 -left-48" />
      <div className="glass-orb w-[300px] h-[300px] bg-teal-400 top-1/3 left-1/4 animate-float" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg glow-amber">
            <Bus size={32} className="text-navy-900" />
          </div>
          <h1 className="text-white text-2xl font-bold">DepotFlow</h1>
          <p className="text-white/40 text-sm mt-1">Smart Workforce Management</p>
        </div>

        {/* Login card — frosted glass */}
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold text-lg mb-1">Welcome back</h2>
          <p className="text-white/40 text-sm mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm animate-fade-in glow-danger" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Employee ID or Email</label>
              <input type="text" className="input" placeholder="e.g. EMP001 or email@example.com"
                value={employeeId} onChange={e => setEmployeeId(e.target.value)} required autoFocus />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="Enter password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base font-semibold">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/8 text-center">
            <p className="text-xs text-white/30">Pandharpur Bus Depot, Maharashtra</p>
            <p className="text-xs text-white/20 mt-1">SIH 2024 · SKH050</p>
          </div>
        </div>


      </div>
    </div>
  );
}
