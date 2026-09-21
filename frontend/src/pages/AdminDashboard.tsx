import React, { useState, useEffect } from 'react';
import { adminApi, authApi } from '../api/endpoints';
import type { ProProfile, User, Job, Payment } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Shield, Check, X, FileText, Activity, Users, UserCheck, Clock, DollarSign, Briefcase, CreditCard, Ban, CheckCircle, KeyRound, Lock } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'kyc' | 'users' | 'jobs' | 'transactions' | 'audit' | 'security'>('kyc');
  const [pendingPros, setPendingPros] = useState<ProProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<{ [key: number]: string }>({});
  
  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();


  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [s, p, u, j, t, l] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getPendingPros().catch(() => []),
        adminApi.getUsers().catch(() => []),
        adminApi.getAllJobs().catch(() => []),
        adminApi.getTransactions().catch(() => []),
        adminApi.getAuditLogs().catch(() => []),
      ]);
      setStats(s);
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

  useEffect(() => {
    loadAdminData();
  }, []);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    try {
      setPasswordLoading(true);
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('Password updated successfully! Please use your new password next time you log in.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        <p className="text-xs text-gray-400 font-medium">Loading Governance Telemetry & Platform Records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-5 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Admin Command Center</h1>
            <p className="text-xs sm:text-sm text-gray-500">Live omni-channel platform telemetry, KYC moderation, user enforcement & escrow audit.</p>
          </div>
        </div>
        <button
          onClick={loadAdminData}
          className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition border border-purple-200 shadow-sm"
        >
          Refresh Live Data
        </button>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats?.total_users ?? users.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified Pros</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats?.verified_pros ?? 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending KYC</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 mt-2">{pendingPros.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Bookings</span>
            <Briefcase className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">{stats?.total_jobs ?? jobs.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Jobs</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats?.completed_jobs ?? 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Commission</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2">15%</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'kyc'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending KYC ({pendingPros.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'jobs'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>All Jobs ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'transactions'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Transactions ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'security'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Password</span>
        </button>
      </div>

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
              {pendingPros.map((pro) => {
                const name = pro.business_name || pro.user_name || pro.user?.full_name || 'Prospective Pro';
                const email = pro.user_email || pro.user?.email || 'N/A';
                const cat = pro.skill_category_name || pro.category?.name || 'Skilled Pro';
                return (
                  <div key={pro.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-extrabold text-gray-900 text-base">{name}</h3>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {cat}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Email: <span className="font-semibold text-gray-700">{email}</span> • Location: <span className="font-semibold text-gray-700">{pro.address_text || 'Lagos'}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Bank: <span className="font-semibold text-gray-700">{pro.bank_name || 'Zenith Bank'}</span> (Code: {pro.bank_code || '057'}) • Acc: <span className="font-mono font-semibold">{pro.masked_account_number || pro.account_number || '•••• 4321'}</span>
                      </p>
                      <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200">
                        <span className="font-semibold">Bio:</span> {pro.bio || 'No bio provided'}
                      </p>
                      {pro.id_document_url && (
                        <a
                          href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/admin/docs/${pro.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-blue-600 hover:underline pt-1 font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> View ID Document
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col justify-between items-end gap-2">
                      <input
                        type="text"
                        placeholder="Decision rationale notes..."
                        value={decisionNotes[pro.id] || ''}
                        onChange={(e) => setDecisionNotes({ ...decisionNotes, [pro.id]: e.target.value })}
                        className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs w-full max-w-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleVerify(pro.id, 'approve')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1 transition shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> <span>Approve Badge</span>
                        </button>
                        <button
                          onClick={() => handleVerify(pro.id, 'reject')}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1 transition"
                        >
                          <X className="w-3.5 h-3.5" /> <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Users Directory */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">User Account Directory & Enforcements</h2>
            <span className="text-xs text-gray-400">Suspend / Activate Client & Pro Accounts</span>
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
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-900">#{u.id}</td>
                    <td className="p-3 font-extrabold text-gray-900">{u.full_name}</td>
                    <td className="p-3 text-gray-600">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'pro' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Revoke Admin — only bootstrap admin sees this, only on other admin rows */}
                        {u.role === 'admin' && u.id !== currentUser?.id && stats?.bootstrap_admin_id === currentUser?.id && (
                          <button
                            onClick={() => handleRevokeAdmin(u.id, u.full_name)}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200"
                            title="Revoke Admin Privileges"
                          >
                            Revoke Admin
                          </button>
                        )}
                        {/* Make Admin + Suspend/Activate — only for non-admin rows */}
                        {u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handlePromoteToAdmin(u.id, u.full_name)}
                              className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
                              title="Promote to Admin"
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => handleToggleUser(u.id, u.is_active)}
                              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                                u.is_active
                                  ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.is_active ? 'Suspend' : 'Activate'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: All Platform Jobs */}
      {activeTab === 'jobs' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900">Platform Jobs & Work Orders</h2>
            <span className="text-xs text-gray-400">Total: {jobs.length} jobs created across all trades</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Assigned Pro</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-400">
                      No jobs have been requested yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">#{j.id}</td>
                      <td className="p-3 font-extrabold text-gray-900 max-w-[200px] truncate">{j.title}</td>
                      <td className="p-3 font-medium text-gray-800">{j.client?.full_name || 'Client #' + j.client_id}</td>
                      <td className="p-3 font-medium text-blue-700">{j.pro_name || j.pro?.user_name || j.pro?.user?.full_name || (j.pro_id ? 'Pro #' + j.pro_id : 'Auto-Dispatching')}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-800">
                          {j.status}
                        </span>
                      </td>
                      <td className="p-3 font-black text-gray-900">₦{(j.budget_amount ?? 0).toLocaleString()}</td>
                      <td className="p-3 text-gray-400">{new Date(j.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
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
            <span className="text-xs text-gray-400">15% platform split fee & 85% pro subaccount settlement</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Platform Fee (15%)</th>
                  <th className="p-3">Pro Payout (85%)</th>
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
                      <td className="p-3 font-mono text-[11px] text-gray-600">{tx.reference}</td>
                      <td className="p-3 font-bold text-blue-600">Job #{tx.job_id}</td>
                      <td className="p-3 font-black text-gray-900">₦{tx.amount.toLocaleString()}</td>
                      <td className="p-3 font-bold text-purple-700">₦{(tx.platform_fee || tx.amount * 0.15).toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-600">₦{(tx.pro_amount || tx.amount * 0.85).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {tx.status.toUpperCase()}
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

      {/* Tab 5: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-700" />
            <h2 className="text-lg font-black text-gray-900">Immutable Governance Audit Trail</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Admin ID</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target User</th>
                  <th className="p-3">Notes & Reason</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">
                      No admin governance actions recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">#{log.admin_id}</td>
                      <td className="p-3 font-bold text-purple-700">{log.action_type || log.action}</td>
                      <td className="p-3 font-medium">User #{log.target_user_id || log.target_id || 'N/A'}</td>
                      <td className="p-3 text-gray-600">{log.notes || '—'}</td>
                      <td className="p-3 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Security & Password Settings */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm max-w-xl space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Security & Credentials</h2>
              <p className="text-xs text-gray-500">Change your administrator password securely.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter current password..."
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Re-type new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {passwordLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

