import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, Key } from 'lucide-react';

export const BootstrapAdmin: React.FC = () => {
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await adminApi.bootstrap({
        bootstrap_token: bootstrapToken,
        email,
        full_name: fullName,
        password,
      });
      login(res.access_token, res.user);
      showToast('Admin account successfully bootstrapped!', 'success');
      navigate('/admin');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Bootstrap authorization failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-purple-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Bootstrap Setup</h2>
          <p className="text-xs text-gray-500">
            One-time zero-hardcoded platform administrator initialization via environment token.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
              Admin Bootstrap Token
            </label>
            <div className="relative">
              <Key className="w-5 h-5 text-purple-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={bootstrapToken}
                onChange={(e) => setBootstrapToken(e.target.value)}
                placeholder="ADMIN_BOOTSTRAP_TOKEN"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Admin Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Lead Platform Admin"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@relaywork.internal"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Secure Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-md shadow-purple-700/20 text-sm"
          >
            {loading ? 'Bootstrapping Admin...' : 'Initialize Platform Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};
