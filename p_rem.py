p_jobs = "frontend/src/pages/MyJobs.tsx"
c_jobs = """import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../api/endpoints';
import { Job, JobStatus } from '../types';
import { Briefcase, ArrowRight } from 'lucide-react';

export const MyJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    jobsApi
      .getAll(statusFilter || undefined)
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Job Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track requested jobs, active assignments, and completion payouts.</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Job Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="paid">Paid & Settled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="text-gray-600 font-medium">No jobs found in this category.</p>
          <Link to="/pros" className="inline-block text-primary-600 font-bold text-sm hover:underline">
            Explore Pros to request work
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-primary-500 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(
                      job.status
                    )}`}
                  >
                    {job.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">Job #{job.id}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{job.description}</p>
              </div>

              <div className="flex items-center justify-between md:justify-end space-x-6 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">Agreed Price</span>
                  <span className="text-base font-extrabold text-gray-900">
                    {job.agreed_price ? `₦${job.agreed_price.toLocaleString()}` : 'Negotiating'}
                  </span>
                </div>

                <Link
                  to={`/jobs/${job.id}`}
                  className="bg-primary-50 hover:bg-primary-100 text-primary-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
"""
with open(p_jobs, 'w', encoding='utf-8') as f:
    f.write(c_jobs)

p_jobdet = "frontend/src/pages/JobDetails.tsx"
c_jobdet = """import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi, paymentsApi, reviewsApi } from '../api/endpoints';
import { Job, JobStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChatBox } from '../components/ChatBox';
import { CheckCircle2, DollarSign, Star } from 'lucide-react';

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceInput, setPriceInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchJob = async () => {
    if (!id) return;
    try {
      const data = await jobsApi.getById(Number(id));
      setJob(data);
      if (data.agreed_price) {
        setPriceInput(data.agreed_price.toString());
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load job details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleUpdateStatus = async (newStatus: JobStatus, price?: number) => {
    if (!job) return;
    try {
      setActionLoading(true);
      const updated = await jobsApi.updateStatus(job.id, newStatus, price);
      setJob(updated);
      showToast(`Job status updated to ${newStatus}!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      const res = await paymentsApi.initialize(job.id);
      showToast('Redirecting to Paystack checkout...', 'info');
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Payment initialization failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    try {
      setActionLoading(true);
      await reviewsApi.create({
        job_id: job.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      showToast('Review submitted! Thank you.', 'success');
      setReviewSubmitted(true);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to submit review', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !job || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isClient = user.id === job.client_id;
  const isPro = user.id === job.pro?.user_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-wider font-extrabold px-3 py-1 bg-primary-50 text-primary-700 rounded-full border border-primary-200">
              {job.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">Job #{job.id}</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">{job.title}</h1>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex space-x-6 text-sm">
          <div>
            <span className="text-xs text-gray-400 block font-bold">Agreed Total</span>
            <span className="font-extrabold text-gray-900">
              {job.agreed_price ? `₦${job.agreed_price.toLocaleString()}` : 'TBD'}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-bold">Platform Fee (15%)</span>
            <span className="font-extrabold text-primary-600">
              {job.platform_fee ? `₦${job.platform_fee.toLocaleString()}` : '₦0'}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-bold">Pro Payout</span>
            <span className="font-extrabold text-emerald-600">
              {job.pro_payout ? `₦${job.pro_payout.toLocaleString()}` : '₦0'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Job Workflow Actions</h3>

            {isPro && job.status === 'pending' && (
              <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-xs font-semibold text-blue-900">
                  Enter agreed quote price (₦) to accept this job:
                </p>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Agreed Amount (e.g. 15000)"
                    className="flex-1 px-4 py-2 rounded-xl border border-blue-300 text-sm"
                  />
                  <button
                    onClick={() => handleUpdateStatus('accepted', Number(priceInput))}
                    disabled={!priceInput || actionLoading}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Accept Job
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={actionLoading}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {isPro && job.status === 'accepted' && (
              <button
                onClick={() => handleUpdateStatus('in_progress')}
                disabled={actionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition text-sm"
              >
                Mark Job as In Progress
              </button>
            )}

            {isPro && job.status === 'in_progress' && (
              <button
                onClick={() => handleUpdateStatus('completed')}
                disabled={actionLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition text-sm"
              >
                Mark Job as Completed
              </button>
            )}

            {isClient && job.status === 'completed' && (
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">Work Completed! Ready for Payment.</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Pay ₦{job.agreed_price?.toLocaleString()} securely via Paystack. Funds will settle split: 15% platform commission and 85% to Pro's bank.
                </p>
                <button
                  onClick={handlePayNow}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-emerald-600/20 text-sm flex items-center justify-center space-x-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Pay ₦{job.agreed_price?.toLocaleString()} Now</span>
                </button>
              </div>
            )}

            {isClient && job.status === 'paid' && !reviewSubmitted && (
              <form onSubmit={handleReviewSubmit} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Rate & Review this Pro</h4>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-amber-400"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the pro's quality and punctuality?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Submit Rating
                </button>
              </form>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Job Information</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        </div>

        <div className="lg:col-span-6">
          <ChatBox jobId={job.id} currentUser={user} />
        </div>
      </div>
    </div>
  );
};
"""
with open(p_jobdet, 'w', encoding='utf-8') as f:
    f.write(c_jobdet)

p_adm = "frontend/src/pages/AdminDashboard.tsx"
c_adm = """import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/endpoints';
import { ProProfile } from '../types';
import { useToast } from '../context/ToastContext';
import { Shield, Check, X, FileText, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [pendingPros, setPendingPros] = useState<ProProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const { showToast } = useToast();

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [s, p, l] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPendingPros(),
        adminApi.getAuditLogs(),
      ]);
      setStats(s);
      setPendingPros(p);
      setAuditLogs(l);
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
      await adminApi.verifyPro(proId, decision, decisionNotes);
      showToast(`Pro successfully ${decision}d!`, 'success');
      setDecisionNotes('');
      loadAdminData();
    } catch (err: any) {
      showToast('Action failed: ' + (err.response?.data?.detail || 'Unknown error'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Governance & KYC Telemetry</h1>
            <p className="text-xs text-gray-500">Manage worker badge verification, view audit trail and commission metrics.</p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <span className="text-xs text-gray-400 font-bold uppercase">Total Users</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.total_users}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <span className="text-xs text-gray-400 font-bold uppercase">Verified Pros</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.verified_pros}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <span className="text-xs text-gray-400 font-bold uppercase">Pending Verification</span>
            <p className="text-2xl font-black text-amber-500 mt-1">{stats.pending_pros}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <span className="text-xs text-gray-400 font-bold uppercase">Settled Commission</span>
            <p className="text-2xl font-black text-primary-600 mt-1">₦{stats.total_commission_collected.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Pending Pro Applications ({pendingPros.length})</h2>

        {pendingPros.length === 0 ? (
          <p className="text-xs text-gray-400 py-4">No pros awaiting verification approval.</p>
        ) : (
          <div className="space-y-4">
            {pendingPros.map((pro) => (
              <div key={pro.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{pro.business_name || pro.user?.full_name}</h3>
                  <p className="text-xs text-primary-600 font-semibold">{pro.category?.name} • {pro.user?.email}</p>
                  <p className="text-xs text-gray-500">Bank: {pro.bank_name || 'N/A'} (Masked: {pro.masked_account_number || 'None'})</p>
                  {pro.id_document_url && (
                    <a
                      href={`http://localhost:8000/api/admin/docs/${pro.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:underline mt-1"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> View Uploaded Document
                    </a>
                  )}
                </div>

                <div className="flex flex-col justify-between items-end gap-2">
                  <input
                    type="text"
                    placeholder="Admin review notes..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs w-full max-w-xs"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerify(pro.id, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1 transition"
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
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900">Governance Audit Trail</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b">
              <tr>
                <th className="p-3">Admin ID</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Notes</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-3 font-semibold">{log.admin_id}</td>
                  <td className="p-3 font-bold text-primary-600">{log.action}</td>
                  <td className="p-3">{log.target_type} #{log.target_id}</td>
                  <td className="p-3 text-gray-500">{log.notes || '—'}</td>
                  <td className="p-3 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
"""
with open(p_adm, 'w', encoding='utf-8') as f:
    f.write(c_adm)

p_boot = "frontend/src/pages/BootstrapAdmin.tsx"
c_boot = """import React, { useState } from 'react';
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
"""
with open(p_boot, 'w', encoding='utf-8') as f:
    f.write(c_boot)

print("All remaining pages written")
