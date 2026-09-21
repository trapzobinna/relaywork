import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { jobsApi, paymentsApi, reviewsApi } from '../api/endpoints';
import type { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChatBox } from '../components/ChatBox';
import { LiveRouteTracker } from '../components/LiveRouteTracker';
import { CheckCircle2, DollarSign, Star, ShieldCheck, Clock, Check, X, Play, Navigation, AlertCircle } from 'lucide-react';

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isBroadcastingLocation, setIsBroadcastingLocation] = useState(false);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const watchIdRef = useRef<number | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  const fetchJob = async () => {
    if (!id) return;
    try {
      const data = await jobsApi.getById(Number(id));
      setJob(data);
      if (data.is_en_route && (data.status === 'accepted' || data.status === 'in_progress')) {
        setIsBroadcastingLocation(true);
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

  // Stop geolocation watcher helper
  const stopLocationWatcher = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcastingLocation(false);
  };

  // Clean up location watcher when job finishes or component unmounts
  useEffect(() => {
    if (job && (job.status === 'completed' || job.status === 'paid' || job.status === 'declined' || job.status === 'cancelled')) {
      stopLocationWatcher();
    }
    return () => {
      stopLocationWatcher();
    };
  }, [job?.status]);

  // Start live GPS tracking when Pro is en route
  const startGpsBroadcast = (jobId: number) => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsBroadcastingLocation(true);

    const sendCoords = async (lat: number, lng: number) => {
      const now = Date.now();
      // Client-side guard aligned with server 5s throttle
      if (now - lastSentTimeRef.current < 4900) return;
      lastSentTimeRef.current = now;

      try {
        await jobsApi.updateLocation(jobId, { latitude: lat, longitude: lng });
      } catch (err) {
        console.warn('Location ping notice:', err);
      }
    };

    // Immediate initial coordinate capture
    navigator.geolocation.getCurrentPosition(
      (pos) => sendCoords(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('GPS initial position notice:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Watch movement every 5 seconds
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.warn('GPS watch error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const handleEnRoute = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      const updated = await jobsApi.setEnRoute(job.id);
      setJob(updated);
      startGpsBroadcast(job.id);
      showToast("You are marked as 'On My Way'! Live GPS route started.", 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update en route status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      const updated = await jobsApi.acceptJob(job.id);
      setJob(updated);
      showToast('Job request accepted successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to accept job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineJob = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      const updated = await jobsApi.declineJob(job.id);
      setJob(updated);
      stopLocationWatcher();
      showToast('Job request declined', 'info');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to decline job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      const updated = await jobsApi.startJob(job.id);
      setJob(updated);
      showToast('Job marked as in progress!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to start job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      stopLocationWatcher();
      const updated = await jobsApi.completeJob(job.id);
      setJob(updated);
      showToast('Job marked as completed! Client can now settle payout.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to complete job', 'error');
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isClient = user.id === job.client_id;
  const isPro = user.id === job.pro_id || user.id === job.pro?.user_id;
  const totalAmount = job.budget_amount || job.agreed_price || 0;
  const platformFee = totalAmount * 0.15;
  const proPayout = totalAmount * 0.85;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-wider font-extrabold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {job.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">Job #{job.id}</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">{job.title}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Client: <span className="font-bold text-gray-700">{job.client_name || 'Client'}</span> • Pro:{' '}
            <span className="font-bold text-blue-600">{job.pro_name || 'Assigned Pro'}</span>
          </p>
        </div>

        {/* Financial Escrow Breakdown Pill */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex space-x-6 text-sm">
          <div>
            <span className="text-xs text-gray-400 block font-bold">Total Budget</span>
            <span className="font-extrabold text-gray-900">
              ₦{totalAmount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-bold">Platform Fee (15%)</span>
            <span className="font-extrabold text-blue-600">
              ₦{platformFee.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-bold">Pro Payout (85%)</span>
            <span className="font-extrabold text-emerald-600">
              ₦{proPayout.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Live Route & Tracking Map when job is accepted, in progress, or completed */}
      {(job.status === 'accepted' || job.status === 'in_progress' || job.status === 'completed') && (
        <LiveRouteTracker job={job} isPro={isPro} onArrived={() => setJob((prev) => prev ? { ...prev, has_arrived: true } : null)} />
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Job Status Actions + Details */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Job Workflow Actions</h3>

            {/* Pro Accept / Decline */}
            {isPro && (job.status === 'requested' || job.status === 'pending') && (
              <div className="space-y-3 bg-blue-50 p-5 rounded-2xl border border-blue-200">
                <p className="text-xs font-semibold text-blue-900">
                  You have a pending service request for ₦{totalAmount.toLocaleString()}:
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAcceptJob}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center space-x-1 shadow-md shadow-blue-600/20"
                  >
                    <Check className="w-4 h-4" /> <span>Accept Job</span>
                  </button>
                  <button
                    onClick={handleDeclineJob}
                    disabled={actionLoading}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center justify-center space-x-1"
                  >
                    <X className="w-4 h-4" /> <span>Decline</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pro "On My Way" Button */}
            {isPro && (job.status === 'accepted' || job.status === 'in_progress') && (
              <div className="space-y-2">
                {!isBroadcastingLocation ? (
                  <button
                    onClick={handleEnRoute}
                    disabled={actionLoading}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-2xl transition text-sm flex items-center justify-center space-x-2 shadow-md shadow-teal-600/20 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>I'm On My Way (Start Live GPS Broadcast)</span>
                  </button>
                ) : (
                  <div className="bg-teal-50 border border-teal-200 p-3 rounded-2xl flex items-center justify-between text-xs text-teal-900">
                    <span className="flex items-center font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping mr-2"></span>
                      GPS Broadcasting Live to Client (5s pings)
                    </span>
                    <button
                      onClick={stopLocationWatcher}
                      className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition"
                    >
                      Pause GPS
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pro Start Work */}
            {isPro && job.status === 'accepted' && (
              <button
                onClick={handleStartJob}
                disabled={actionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition text-sm flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20"
              >
                <Play className="w-4 h-4" />
                <span>Start Job / Mark In Progress</span>
              </button>
            )}

            {/* Pro or Client Mark Completed */}
            {(job.status === 'in_progress' || job.status === 'accepted') && (
              <button
                onClick={handleCompleteJob}
                disabled={actionLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-2xl transition text-sm flex items-center justify-center space-x-2 shadow-md shadow-purple-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Work as Completed</span>
              </button>
            )}

            {/* Client Pay Button */}
            {isClient && job.status === 'completed' && (
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm">Work Completed! Settle Escrow Payment.</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Pay ₦{totalAmount.toLocaleString()} securely via Paystack split checkout. Pro receives ₦{proPayout.toLocaleString()} directly.
                </p>
                <button
                  onClick={handlePayNow}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-emerald-600/20 text-sm flex items-center justify-center space-x-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Pay ₦{totalAmount.toLocaleString()} Now via Paystack</span>
                </button>
              </div>
            )}

            {/* Review Form */}
            {isClient && job.status === 'paid' && !reviewSubmitted && (
              <form onSubmit={handleReviewSubmit} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Rate & Review this Pro</h4>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-amber-400"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the pro's quality, responsiveness, and punctuality?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition"
                >
                  Submit Review
                </button>
              </form>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Job Description & Site Address</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
            {job.location_address && (
              <p className="text-xs text-gray-400 pt-2 border-t">📍 {job.location_address}</p>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat & Quote Negotiation */}
        <div className="lg:col-span-6">
          <ChatBox jobId={job.id} currentUser={user} />
        </div>
      </div>
    </div>
  );
};
