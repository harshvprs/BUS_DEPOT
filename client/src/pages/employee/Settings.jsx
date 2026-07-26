import { useState } from 'react';
import { supabase } from '../../supabase';
import { Settings as SettingsIcon, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handlePasswordReset(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      
      setSuccess('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={24} className="text-white" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock size={18} className="text-amber-400" />
          Change Password
        </h2>
        
        {success && (
          <div className="mb-4 p-3 bg-success-50 text-emerald-300 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input 
              type="password" 
              className="input" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input 
              type="password" 
              className="input" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full py-3 mt-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-3">Profile Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-white/40">Name</span>
            <span className="font-medium text-white">{user?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-white/40">Employee ID</span>
            <span className="font-mono text-white">{user?.employee_id}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-white/40">Phone</span>
            <span className="text-white">{user?.phone || 'Not provided'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
