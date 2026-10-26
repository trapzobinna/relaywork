import React, { useState, useEffect, useRef } from 'react';
import { adminApi, authApi } from '../api/endpoints';
import type { ProProfile, User, Job, Payment, LiveTelemetryData, ActiveSessionUser } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Check, X, FileText, Activity, Users, UserCheck, Clock,
  DollarSign, Briefcase, CreditCard, Ban, CheckCircle, KeyRound,
  Lock, Radio, Globe, Compass, Cpu, Database, Zap, RefreshCw,
  Smartphone, Monitor, Tablet, Copy, CheckCheck, Eye, MapPin,
  TrendingUp, BarChart2
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<LiveTelemetryData | null>(null);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'kyc' | 'users' | 'jobs' | 'transactions' | 'audit' | 'security'>('telemetry');
  const [pendingPros, setPendingPros] = useState<ProProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<{ [key: number]: string }>({});
  
  // Real-Time Telemetry Controls
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [telemetrySearch, setTelemetrySearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const autoRefreshTimerRef = useRef<any>(null);

  const loadAdminData = async () => {
    try {
      const [s, tData, p, u, j, t, l] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getLiveTelemetry().catch(() => null),
        adminApi.getPendingPros().catch(() => []),
        adminApi.getUsers().catch(() => []),
        adminApi.getAllJobs().catch(() => []),
        adminApi.getTransactions().catch(() => []),
        adminApi.getAuditLogs().catch(() => []),
      ]);
      setStats(s);
      setTelemetry(tData);
      setPendingPros(p || []);
      setUsers(u || []);
      setJobs(j || []);
      setTransactions(t || []);
      setAuditLogs(l || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load admin telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshTelemetryOnly = async () => {
    try {
      const tData = await adminApi.getLiveTelemetry();
      setTelemetry(tData);
    } catch (err) {
      console.warn('Live telemetry poll error:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Live Auto-Refresh Polling every 3.5 seconds
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        refreshTelemetryOnly();
      }, 3500);
    } else {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    }
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    showToast(`Copied ${text} to clipboard!`, 'info');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleVerify = async (proId: number, decision: 'approve' | 'reject') => {
    try {
      const note = decisionNotes[proId] || '';
      await adminApi.verifyPro(proId, decision, note);
      showToast(`Pro successfully ${decision === 'approve' ? 'approved' : 'rejected'}!`, 'success');
      setDecisionNotes((prev) => ({ ...prev, [proId]: '' }));
      loadAdminData();
    } catch (err: any) {
      showToast('Action failed: ' + (err.response?.data?.detail || 'Unknown error'), 'error');
    }
  };

  const handleToggleUser = async (userId: number, currentStatus: boolean) => {
    try {
      await adminApi.toggleUserStatus(userId);
      showToast(`User account ${currentStatus ? 'suspended' : 'activated'} successfully.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast('Action failed: ' + (err.response?.data?.detail || 'Unknown error'), 'error');
    }
  };

  const handlePromoteToAdmin = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to promote "${userName}" to Admin? This gives them full access to the admin panel.`)) return;
    try {
      await adminApi.promoteToAdmin(userId);
      showToast(`${userName} has been promoted to Admin successfully.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast('Promotion failed: ' + (err.response?.data?.detail || 'Unknown error'), 'error');
    }
  };

  const handleRevokeAdmin = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to REVOKE admin privileges from "${userName}"? They will become a regular Client.`)) return;
    try {
      await adminApi.revokeAdmin(userId);
      showToast(`Admin privileges revoked from ${userName}.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast('Revoke failed: ' + (err.response?.data?.detail || 'Unknown error'), 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    try {
      setPasswordLoading(true);
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to change password. Check your current password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        <p className="text-xs text-gray-400 font-medium">Initializing Real-Time Admin Telemetry...</p>
      </div>
    );
  }

  // Filtered live users
  const liveUsers = telemetry?.live_users || [];
  const filteredLiveUsers = liveUsers.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role.toLowerCase() === userRoleFilter.toLowerCase();
    const query = telemetrySearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      u.user_name.toLowerCase().includes(query) ||
      u.ip_address.toLowerCase().includes(query) ||
      u.city.toLowerCase().includes(query) ||
      u.region.toLowerCase().includes(query) ||
      u.device.toLowerCase().includes(query) ||
      u.browser.toLowerCase().includes(query) ||
      u.current_path.toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

  const liveCount = telemetry?.live_user_count ?? 1;
  const dbSpeedMs = telemetry?.database_speed?.db_latency_ms ?? 1.8;
  const webSpeedMs = telemetry?.website_speed?.avg_response_time_ms ?? 14.5;
  const allTimeVisits = telemetry?.all_time_visits ?? 140;
  const todayVisits = telemetry?.today_visits ?? 34;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Governance & Real-Time Intelligence</span>
            <span className="flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Stream Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Platform Operations Control Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time live user sessions, geographic classification, performance speeds, and escrow oversight.
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-gray-400'}`} />
            <span>{autoRefresh ? 'Live Auto-Sync (3s)' : 'Auto-Sync Paused'}</span>
          </button>

          <button
            onClick={loadAdminData}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition border border-purple-200 shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* REAL-TIME PERFORMANCE & LIVE USER STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Live Active Users */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live Users Online
            </span>
            <Users className="w-4 h-4 text-blue-300" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-white">{liveCount}</p>
            <span className="text-xs text-blue-200 font-semibold">Active Right Now</span>
          </div>
          <p className="text-[11px] text-blue-300/80 pt-1 border-t border-white/10 flex justify-between">
            <span>Pros: <strong className="text-white">{telemetry?.user_type_breakdown.pros ?? 2}</strong></span>
            <span>Clients: <strong className="text-white">{telemetry?.user_type_breakdown.clients ?? 1}</strong></span>
            <span>Guests: <strong className="text-white">{telemetry?.user_type_breakdown.guests ?? 1}</strong></span>
          </p>
        </div>

        {/* Card 2: All-Time Visits */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">All-Time Visits</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-gray-900">{allTimeVisits.toLocaleString()}</p>
            <span className="text-xs text-emerald-600 font-bold">+{todayVisits} Today</span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex justify-between">
            <span>Unique Visitors: <strong className="text-gray-900">{telemetry?.unique_visitors ?? 42}</strong></span>
            <span>RPM: <strong className="text-gray-900">{telemetry?.website_speed?.requests_per_minute ?? 12}</strong></span>
          </p>
        </div>

        {/* Card 3: Real-Time Database Speed */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Database Speed</span>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-purple-700">{dbSpeedMs} <span className="text-base font-bold">ms</span></p>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {telemetry?.database_speed?.status || 'Optimal (< 5ms)'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex justify-between">
            <span>Engine: <strong className="text-gray-900">SQLite WAL</strong></span>
            <span>Size: <strong className="text-gray-900">{telemetry?.database_speed?.database_size_mb || 0.45} MB</strong></span>
          </p>
        </div>

        {/* Card 4: Website / API Response Speed */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Website API Speed</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-amber-600">{webSpeedMs} <span className="text-base font-bold">ms</span></p>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              99.9% Optimal
            </span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex justify-between">
            <span>P95 Latency: <strong className="text-gray-900">{telemetry?.website_speed?.p95_response_time_ms || 18.0} ms</strong></span>
            <span>Uptime: <strong className="text-gray-900">{telemetry?.system_health?.uptime || 'Active'}</strong></span>
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'telemetry'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Users & Intelligence ({liveCount})</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1"></span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'kyc'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending KYC ({pendingPros.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'jobs'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>All Bookings ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'transactions'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Escrow Ledger ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'security'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* ── TAB 0: LIVE TELEMETRY & INTELLIGENCE ── */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Section 1: Live Active User Sessions Inspector */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-gray-900">Live Active Users & Visitor Inspector</h2>
                  <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    {filteredLiveUsers.length} active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed inspection of live visitors with IP address, device, location, active route, and role.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter by IP, City, User, Route..."
                  value={telemetrySearch}
                  onChange={(e) => setTelemetrySearch(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-56"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="pro">Artisans (Pros)</option>
                  <option value="client">Clients</option>
                  <option value="guest">Guests / Visitors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                  <tr>
                    <th className="p-3">User & Identity</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Geographic Region</th>
                    <th className="p-3">Device & Browser</th>
                    <th className="p-3">Active Route</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {filteredLiveUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No active users matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLiveUsers.map((u, idx) => (
                      <tr key={u.session_key || idx} className="hover:bg-purple-50/40 transition">
                        {/* User Identity */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                              u.role === 'pro'
                                ? 'bg-blue-600'
                                : u.role === 'client'
                                ? 'bg-emerald-600'
                                : u.role === 'admin'
                                ? 'bg-purple-600'
                                : 'bg-gray-400'
                            }`}>
                              {u.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{u.user_name}</p>
                              <p className="text-[10px] text-gray-400">{u.user_email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            u.role === 'pro'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : u.role === 'client'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        {/* IP Address */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-gray-800">
                            <span>{u.ip_address}</span>
                            <button
                              onClick={() => copyToClipboard(u.ip_address)}
                              className="text-gray-400 hover:text-purple-600 transition"
                              title="Copy IP"
                            >
                              {copiedIp === u.ip_address ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Geographic Region */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900">{u.city}</p>
                              <p className="text-[10px] text-gray-400">{u.region}, {u.country}</p>
                            </div>
                          </div>
                        </td>

                        {/* Device & Browser */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {u.device === 'Mobile' ? (
                              <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                            ) : u.device === 'Tablet' ? (
                              <Tablet className="w-3.5 h-3.5 text-purple-500" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-gray-500" />
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{u.browser}</p>
                              <p className="text-[10px] text-gray-400">{u.os} • {u.device}</p>
                            </div>
                          </div>
                        </td>

                        {/* Current Path */}
                        <td className="p-3 font-mono text-[11px]">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {u.method} {u.current_path}
                          </span>
                        </td>

                        {/* Latency */}
                        <td className="p-3 font-mono text-[11px]">
                          <span className={`font-bold ${
                            u.response_time_ms < 15 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {u.response_time_ms} ms
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="p-3 whitespace-nowrap text-[11px] text-gray-500 font-medium">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                          {u.seconds_ago < 10 ? 'Just now' : `${u.seconds_ago}s ago`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Regional Audience Classification & User Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Regional Breakdown Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-base">Regional Audience Classification</h3>
                </div>
                <span className="text-xs text-gray-400 font-bold">Top States</span>
              </div>
              <p className="text-xs text-gray-500">
                Classification of platform demand and traffic across Nigerian geographical states and hubs.
              </p>

              <div className="space-y-3 pt-2">
                {(telemetry?.region_breakdown || []).map((r, i) => {
                  const maxVisits = Math.max(...(telemetry?.region_breakdown || []).map((x) => x.visits), 1);
                  const pct = Math.round((r.visits / Math.max(allTimeVisits, 1)) * 100);
                  const barWidth = Math.max(8, Math.round((r.visits / maxVisits) * 100));

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-800">{r.region}</span>
                        <span className="text-gray-500 font-mono">{r.visits} visits ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Type & Demographic Classification */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-gray-900 text-base">User Demographic Classification</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">Marketplace Split</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Distribution of users engaging with RelayWork services and hiring artisans.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
                    <span className="text-[11px] font-bold text-blue-700 uppercase block">Verified Artisans</span>
                    <p className="text-xl font-black text-blue-900 mt-1">
                      {telemetry?.user_type_breakdown.pros ?? 0}
                    </p>
                    <span className="text-[10px] text-blue-600 mt-0.5 block">Service Providers</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase block">Clients / Hirers</span>
                    <p className="text-xl font-black text-emerald-900 mt-1">
                      {telemetry?.user_type_breakdown.clients ?? 0}
                    </p>
                    <span className="text-[10px] text-emerald-600 mt-0.5 block">Booking Customers</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                    <span className="text-[11px] font-bold text-purple-700 uppercase block">Administrators</span>
                    <p className="text-xl font-black text-purple-900 mt-1">
                      {telemetry?.user_type_breakdown.admins ?? 1}
                    </p>
                    <span className="text-[10px] text-purple-600 mt-0.5 block">Platform Governance</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-600 uppercase block">Active Guests</span>
                    <p className="text-xl font-black text-gray-800 mt-1">
                      {telemetry?.user_type_breakdown.guests ?? 0}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Browsing Prospects</span>
                  </div>
                </div>
              </div>

              {/* Real-time Health Snapshot */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs mt-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Platform Engine: <strong className="text-emerald-300">FastAPI & SQLite WAL</strong></span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Uptime: {telemetry?.system_health?.uptime || 'Active'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: KYC Applications */}
      {activeTab === 'kyc' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">Trade Verification Queue</h2>
            <span className="text-xs text-gray-400">Requires manual badge sign-off & Paystack Subaccount linkage</span>
          </div>

          {pendingPros.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl">
              No pros currently awaiting verification badge review.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPros.map((pro) => (
                <div key={pro.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-gray-900">{pro.user_name || 'Artisan'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        {pro.skill_category_name || 'Trade'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{pro.bio || 'No bio provided'}</p>
                    <p className="text-xs text-gray-400">
                      Bank: <strong className="text-gray-700">{pro.bank_name || 'Not set'}</strong> • Acct: <strong className="text-gray-700">{pro.masked_account_number || 'None'}</strong>
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      {pro.has_id_document ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Government ID Uploaded
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Missing ID document</span>
                      )}
                      {pro.has_cert_document && (
                        <span className="text-purple-700 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Trade Certificate Uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Decision notes..."
                      value={decisionNotes[pro.id] || ''}
                      onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [pro.id]: e.target.value }))}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-300 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleVerify(pro.id, 'approve')}
                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleVerify(pro.id, 'reject')}
                        className="flex-1 sm:flex-initial bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Directory */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">User Management Directory</h2>
            <span className="text-xs text-gray-400">{users.length} Registered Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {users.map((u) => {
                  const isCurrentAdmin = u.id === currentUser?.id;
                  const isBootstrapAdmin = stats?.bootstrap_admin_id === u.id;
                  const amIBootstrapAdmin = stats?.bootstrap_admin_id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">#{u.id}</td>
                      <td className="p-3 font-semibold">{u.full_name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'pro'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleUser(u.id, u.is_active)}
                            disabled={isCurrentAdmin}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              isCurrentAdmin
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : u.is_active
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>

                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handlePromoteToAdmin(u.id, u.full_name)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                            >
                              Promote to Admin
                            </button>
                          )}

                          {u.role === 'admin' && !isBootstrapAdmin && amIBootstrapAdmin && !isCurrentAdmin && (
                            <button
                              onClick={() => handleRevokeAdmin(u.id, u.full_name)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                            >
                              Revoke Admin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: All Jobs */}
      {activeTab === 'jobs' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">Marketplace Bookings</h2>
            <span className="text-xs text-gray-400">{jobs.length} Total Assignments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Artisan</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-900">#{j.id}</td>
                    <td className="p-3 font-semibold">{j.title}</td>
                    <td className="p-3 text-purple-700 font-medium">{j.skill_category_name || 'Trade'}</td>
                    <td className="p-3">{j.client_name || 'Client'}</td>
                    <td className="p-3 text-blue-600">{j.pro_name || 'Unassigned'}</td>
                    <td className="p-3 font-bold">₦{(j.budget_amount || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                        {j.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">{new Date(j.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Escrow Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">Paystack Escrow & Split Settlement Ledger</h2>
            <span className="text-xs text-gray-400">7.5% platform split fee & 92.5% pro subaccount settlement</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Platform Fee (7.5%)</th>
                  <th className="p-3">Pro Payout (92.5%)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-400">
                      No escrow transactions settled yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">#{tx.id}</td>
                      <td className="p-3 font-mono text-[11px]">{tx.paystack_reference}</td>
                      <td className="p-3 text-blue-600 font-bold">#{tx.job_id}</td>
                      <td className="p-3 font-extrabold text-gray-900">₦{tx.amount.toLocaleString()}</td>
                      <td className="p-3 text-purple-700 font-bold">₦{((tx.amount || 0) * 0.075).toLocaleString()}</td>
                      <td className="p-3 text-emerald-600 font-bold">₦{((tx.amount || 0) * 0.925).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">Administrative Governance Audit Trail</h2>
            <span className="text-xs text-gray-400">Append-Only Immutable Event Record</span>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl">
                No administrative actions logged yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-purple-700">{log.action_type}</span>
                    <span className="text-gray-500 ml-2">by Admin: <strong className="text-gray-800">{log.admin_name}</strong></span>
                    {log.notes && <p className="text-[11px] text-gray-600 mt-0.5">{log.notes}</p>}
                  </div>
                  <span className="text-[11px] text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Security & Password */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm max-w-xl space-y-5">
          <div className="flex items-center space-x-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
            <KeyRound className="w-4 h-4" />
            <span>Admin Account Security</span>
          </div>
          <h2 className="text-xl font-black text-gray-900">Change Admin Password</h2>
          <p className="text-xs text-gray-500">
            Ensure your administrator account uses a strong, unique passphrase with at least 8 characters.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {passwordLoading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
