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
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Bus size={32} className="text-navy-900" />
          </div>
          <h1 className="text-white text-2xl font-bold">DepotFlow</h1>
          <p className="text-navy-300 text-sm mt-1">Smart Workforce Management</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-navy-900 font-semibold text-lg mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm animate-fade-in">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base font-semibold">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Kempegowda Bus Depot, Bangalore</p>
            <p className="text-xs text-gray-300 mt-1">SIH 2024 · SKH050</p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3 bg-navy-800/50 rounded-xl border border-navy-700">
          <p className="text-navy-300 text-xs font-medium mb-1">Demo Credentials</p>
          <p className="text-navy-400 text-xs">Admin: ADMIN001 / admin123</p>
          <p className="text-navy-400 text-xs">Employee: EMP001 / password123</p>
        </div>
      </div>
    </div>
  );
}
