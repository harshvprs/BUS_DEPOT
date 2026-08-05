import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await resetPassword(identifier);
      // Fallback in case of success
      setMessage('If an account exists, a password reset link has been sent to the registered email.');
    } catch (err) {
      // 🛡️ Sentinel: Fix User Enumeration Vulnerability
      // We don't expose error messages because it might allow an attacker
      // to determine if a specific employee ID or email is registered.
      // E.g., "User not found" vs generic error.
      console.error('Password reset requested, handling securely.');
      setMessage('If an account exists, a password reset link has been sent to the registered email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glass-orb w-[500px] h-[500px] bg-amber-500 -top-48 -right-48" />
      <div className="glass-orb w-[400px] h-[400px] bg-blue-600 bottom-0 -left-48" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg glow-amber">
            <Bus size={32} className="text-navy-900" />
          </div>
          <h1 className="text-white text-2xl font-bold">DepotFlow</h1>
        </div>

        <div className="glass-card p-6">
          <button onClick={() => navigate('/login')} className="flex items-center text-white/50 hover:text-white mb-4 text-sm transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to login
          </button>
          
          <h2 className="text-white font-semibold text-lg mb-1">Reset Password</h2>
          <p className="text-white/40 text-sm mb-6">Enter your Employee ID or Email to receive a reset link.</p>

          {message && (
            <div className="mb-4 p-3 rounded-xl text-sm animate-fade-in glow-success" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Employee ID or Email</label>
              <input type="text" className="input" placeholder="e.g. EMP001 or email@example.com"
                value={identifier} onChange={e => setIdentifier(e.target.value)} required autoFocus />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base font-semibold">
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
