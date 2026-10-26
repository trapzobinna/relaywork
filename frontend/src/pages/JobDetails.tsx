import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { jobsApi, paymentsApi, reviewsApi, quotesApi } from '../api/endpoints';
import type { Job, Quote, Milestone, MaterialLine, MaterialsMode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChatBox } from '../components/ChatBox';
import { LiveRouteTracker } from '../components/LiveRouteTracker';
import {
  CheckCircle2, DollarSign, Star, ShieldCheck, Clock, Check,
  X, Play, Navigation, AlertCircle, MapPin, FileText, Plus,
  Trash2, Shield, AlertTriangle, ArrowRight, Layers, HelpCircle
} from 'lucide-react';

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isBroadcastingLocation, setIsBroadcastingLocation] = useState(false);

  // Diagnosis Modal / Form States
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisNotes, setDiagnosisNotes] = useState('');

  // Structured Quote Builder States (Pro)
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [quoteLaborTotal, setQuoteLaborTotal] = useState<number>(50000);
  const [quoteMaterialsMode, setQuoteMaterialsMode] = useState<MaterialsMode>('mode_a_client');
  const [quoteMaterialsEstimate, setQuoteMaterialsEstimate] = useState<number>(0);
  const [quoteWarrantyDays, setQuoteWarrantyDays] = useState<number>(14);
  const [milestonesInput, setMilestonesInput] = useState<Array<{ name: string; amount: number; checklist: string }>>([
    { name: 'Phase 1: Mobilization & Site Setup', amount: 15000, checklist: 'Arrival, equipment setup, safety check' },
    { name: 'Phase 2: Execution & Installation', amount: 25000, checklist: 'Core trade work, wiring or plumbing' },
    { name: 'Phase 3: Testing & Handover', amount: 10000, checklist: 'Function test, clean-up, handover' },
  ]);
  const [materialLinesInput, setMaterialLinesInput] = useState<Array<{ name: string; spec: string; qty: number; unitPrice: number }>>([]);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const watchIdRef = useRef<number | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  const fetchJobAndQuotes = async () => {
    if (!id) return;
    try {
      const [data, qList] = await Promise.all([
        jobsApi.getById(Number(id)),
        quotesApi.getByJob(Number(id)).catch(() => [])
      ]);
      setJob(data);
      setQuotes(qList || []);
      if (data.diagnosis_notes) {
        setDiagnosisNotes(data.diagnosis_notes);
      }
      if (data.is_en_route && (data.status === 'accepted' || data.status === 'en_route')) {
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
    fetchJobAndQuotes();
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
      if (now - lastSentTimeRef.current < 4900) return;
      lastSentTimeRef.current = now;

      try {
        await jobsApi.updateLocation(jobId, { latitude: lat, longitude: lng });
      } catch (err) {
        console.warn('Location ping notice:', err);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => sendCoords(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('GPS initial position notice:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

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
      showToast("Status updated to 'En Route'! GPS broadcast active.", 'success');
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
      showToast('Job request accepted successfully! Prepare to depart.', 'success');
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

  // Diagnosis Submission (Pro on site)
  const handleSubmitDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !diagnosisNotes.trim()) {
      showToast('Please provide your diagnostic findings and safety notes.', 'error');
      return;
    }
    try {
      setActionLoading(true);
      const res = await quotesApi.submitDiagnosis(job.id, diagnosisNotes.trim());
      showToast('Diagnosis submitted successfully! You can now create the quote.', 'success');
      setShowDiagnosisModal(false);
      fetchJobAndQuotes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to submit diagnosis', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Structured Quote Creation (Pro)
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    // Validate milestones sum
    const milestonesSum = milestonesInput.reduce((acc, m) => acc + Number(m.amount), 0);
    if (milestonesSum !== Number(quoteLaborTotal)) {
      showToast(`Milestones sum (₦${milestonesSum.toLocaleString()}) must match total labor (₦${quoteLaborTotal.toLocaleString()})`, 'error');
      return;
    }

    // Mobilization cap: Milestone 1 <= 30% if multiple milestones
    if (milestonesInput.length > 1 && milestonesInput[0].amount > quoteLaborTotal * 0.30) {
      showToast(`Milestone 1 (₦${milestonesInput[0].amount.toLocaleString()}) exceeds the 30% mobilization cap (₦${(quoteLaborTotal * 0.30).toLocaleString()})`, 'error');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        labor_total_kobo: Math.round(Number(quoteLaborTotal) * 100),
        materials_mode: quoteMaterialsMode,
        materials_estimate_kobo: Math.round(Number(quoteMaterialsEstimate) * 100),
        warranty_days: Number(quoteWarrantyDays),
        milestones: milestonesInput.map((m, idx) => ({
          seq: idx + 1,
          name: m.name,
          amount_kobo: Math.round(Number(m.amount) * 100),
          checklist: m.checklist
        })),
        material_lines: materialLinesInput.map(ml => ({
          name: ml.name,
          spec: ml.spec,
          qty: Number(ml.qty) || 1,
          unit_estimate_kobo: Math.round(Number(ml.unitPrice) * 100)
        }))
      };

      await quotesApi.create(job.id, payload);
      showToast('Structured quote sent to client with 50% Diagnostic Credit applied!', 'success');
      setShowQuoteBuilder(false);
      fetchJobAndQuotes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to create quote', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Client Quote Acceptance & Escrow Funding
  const handleAcceptQuote = async (quoteId: number) => {
    try {
      setActionLoading(true);
      await quotesApi.accept(quoteId);
      showToast('Quote accepted and funded into Escrow! Work is now officially underway.', 'success');
      fetchJobAndQuotes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to accept quote', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineQuote = async (quoteId: number) => {
    try {
      setActionLoading(true);
      await quotesApi.decline(quoteId);
      showToast('Quote declined. Pro has been notified.', 'info');
      fetchJobAndQuotes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to decline quote', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Milestone Actions
  const handleCompleteMilestone = async (milestoneId: number) => {
    try {
      setActionLoading(true);
      await quotesApi.completeMilestone(milestoneId);
      showToast('Milestone submitted as completed! Client notified for inspection & release.', 'success');
      fetchJobAndQuotes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update milestone', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveMilestone = async (milestoneId: number) => {
    try {
      setActionLoading(true);
      await quotesApi.approveMilestone(milestoneId);
      showToast('Milestone payment released from escrow to artisan (92.5% pro / 7.5% platform)!', 'success');
      fetchJobAndQuotes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to release milestone', 'error');
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
  const activeQuote = quotes.find(q => q.status === 'accepted') || quotes[0];
  const diagnosticCredit = Math.round((job.call_out_kobo || 600000) * 0.50) / 100.0;

  // Status Step Index
  const getStepIndex = () => {
    switch (job.status) {
      case 'requested': return 1;
      case 'accepted': return 2;
      case 'en_route': return 3;
      case 'on_site': return 4;
      case 'quote_sent': return 4;
      case 'in_progress':
      case 'quote_funded': return 5;
      case 'completed':
      case 'released':
      case 'paid': return 6;
      default: return 1;
    }
  };
  const stepIdx = getStepIndex();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Visual Workflow Pipeline Stepper */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {job.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400 font-bold">Job #{job.id}</span>
              {job.job_type === 'quick_fix' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Quick Fix Rate Card
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Diagnostic Quoted Job
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-2">{job.title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Client: <span className="font-bold text-gray-700">{job.client_name || 'Client'}</span> • Artisan:{' '}
              <span className="font-bold text-blue-600">{job.pro_name || 'Assigned Pro'}</span>
            </p>
          </div>

          {/* Call-Out & Escrow Banner */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex space-x-6 text-sm">
            <div>
              <span className="text-[11px] text-gray-400 block font-bold uppercase">Call-Out Fee</span>
              <span className="font-extrabold text-gray-900">
                ₦{((job.call_out_kobo || 600000) / 100).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block font-bold uppercase">Surge Factor</span>
              <span className="font-extrabold text-blue-600">
                {job.surge_multiplier || 1.0}x
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block font-bold uppercase">50% Quote Credit</span>
              <span className="font-extrabold text-emerald-600">
                ₦{diagnosticCredit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 6-Step Visual Bar */}
        <div className="grid grid-cols-6 gap-2 pt-2 border-t border-gray-100">
          {[
            { num: 1, label: 'Requested' },
            { num: 2, label: 'Accepted' },
            { num: 3, label: 'En Route' },
            { num: 4, label: 'Diagnosis & Quote' },
            { num: 5, label: 'Milestones Escrow' },
            { num: 6, label: 'Completed' },
          ].map((st) => (
            <div key={st.num} className="space-y-1">
              <div
                className={`h-2 rounded-full transition-all ${
                  stepIdx >= st.num
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              />
              <span
                className={`text-[10px] sm:text-xs block font-bold truncate ${
                  stepIdx >= st.num ? 'text-blue-700 font-extrabold' : 'text-gray-400'
                }`}
              >
                {st.num}. {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Route & Tracking Map when job is en route or in progress */}
      {(job.status === 'accepted' || job.status === 'en_route' || job.status === 'in_progress') && (
        <LiveRouteTracker
          job={job}
          isPro={isPro}
          onArrived={() => setJob((prev) => (prev ? { ...prev, has_arrived: true, status: 'on_site' as any } : null))}
        />
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Job Status Actions + Structured Quoting Engine */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Pro Accept / Decline Box */}
          {isPro && job.status === 'requested' && (
            <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-sm space-y-4 bg-gradient-to-br from-blue-50/60 to-white">
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span>New Job Request Received</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Client has requested your service at <span className="font-bold">{job.location_address || 'client location'}</span>.
                The call-out fee of <span className="font-bold">₦{((job.call_out_kobo || 600000)/100).toLocaleString()}</span> is pre-authorized in platform escrow.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAcceptJob}
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                >
                  <Check className="w-4 h-4" /> <span>Accept & Lock Dispatch</span>
                </button>
                <button
                  onClick={handleDeclineJob}
                  disabled={actionLoading}
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-5 py-3.5 rounded-xl transition border border-red-200 flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" /> <span>Decline</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Pro "Depart & Go En Route" */}
          {isPro && job.status === 'accepted' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-900 text-base">Travel & Arrival Actions</h3>
              <p className="text-xs text-gray-500">
                Notify the client you are on the road and initiate live GPS breadcrumb tracking.
              </p>
              <button
                onClick={handleEnRoute}
                disabled={actionLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-2xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
              >
                <Navigation className="w-4 h-4" />
                <span>I'm On My Way (Start Live GPS Transit)</span>
              </button>
            </div>
          )}

          {/* 3. On-Site Diagnosis Section */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-base">On-Site Diagnosis & Safety Findings</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Required on-site inspection before any structured quote can be issued.
                </p>
              </div>
              {job.diagnosis_notes && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Diagnosis Completed
                </span>
              )}
            </div>

            {job.diagnosis_notes ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Artisan Inspection Notes:</span>
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {job.diagnosis_notes}
                </p>
              </div>
            ) : isPro ? (
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-center space-y-3">
                <p className="text-xs font-semibold text-blue-900">
                  {job.status === 'en_route' ? 'When you arrive on site, log your diagnostic findings to unlock the quoting tool:' : 'You are on site. Please log your inspection findings:'}
                </p>
                <button
                  onClick={() => setShowDiagnosisModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Log Inspection Findings</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Artisan has not logged on-site diagnosis notes yet.
              </p>
            )}
          </div>

          {/* 4. Structured Quoting & Milestones Engine */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Structured Milestone Quote & Escrow</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phased labor releases & material transparency with double-entry escrow protection.
                </p>
              </div>
              {isPro && (job.status === 'on_site' || job.status === 'quote_sent') && (
                <button
                  onClick={() => setShowQuoteBuilder(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{activeQuote ? 'Revise Quote' : 'Build Structured Quote'}</span>
                </button>
              )}
            </div>

            {/* Display Active Quote Card */}
            {activeQuote ? (
              <div className="border border-indigo-100 rounded-2xl overflow-hidden shadow-xs">
                {/* Quote Header Pill */}
                <div className="bg-gradient-to-r from-indigo-900 to-blue-950 p-4 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                      Quote v{activeQuote.version} • {activeQuote.status.toUpperCase()}
                    </span>
                    <h4 className="text-base font-black text-white mt-0.5">
                      Labor Total: ₦{activeQuote.labor_total_naira.toLocaleString()}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-300 block font-bold">50% Call-Out Credit</span>
                    <span className="text-sm font-black text-emerald-400">
                      -₦{activeQuote.diagnostic_credit_naira.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Net Payable Bar */}
                <div className="bg-indigo-50/70 px-4 py-3 border-b border-indigo-100 flex justify-between items-center text-xs">
                  <span className="font-bold text-indigo-900">
                    Net Client Labor Payable:
                  </span>
                  <span className="font-black text-indigo-900 text-sm">
                    ₦{activeQuote.net_payable_labor_naira.toLocaleString()}
                  </span>
                </div>

                {/* Materials Mode Banner */}
                <div className="p-4 bg-gray-50/60 border-b border-gray-100 text-xs text-gray-700 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <span>Materials Mode: {activeQuote.materials_mode === 'mode_b_wallet' ? 'Mode B (Artisan Materials Wallet)' : 'Mode A (Client Direct Purchase)'}</span>
                  </div>
                  {activeQuote.materials_mode === 'mode_b_wallet' && (
                    <span className="font-extrabold text-purple-700">
                      +₦{activeQuote.materials_estimate_naira.toLocaleString()} Materials Escrow
                    </span>
                  )}
                </div>

                {/* Milestones List */}
                <div className="p-4 space-y-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Execution Milestones ({activeQuote.milestones.length})
                  </span>
                  {activeQuote.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-gray-200/80 bg-white hover:border-gray-300 transition flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">
                            {m.seq}
                          </span>
                          <span className="text-xs font-bold text-gray-900">{m.name}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            m.status === 'released'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.status === 'completed'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : m.status === 'funded'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        {m.checklist && (
                          <p className="text-[11px] text-gray-500 pl-7">{m.checklist}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                        <span className="text-xs font-extrabold text-gray-900">
                          ₦{m.amount_naira.toLocaleString()}
                        </span>

                        {/* Pro: Mark Complete button */}
                        {isPro && (m.status === 'funded' || m.status === 'in_progress') && (
                          <button
                            onClick={() => handleCompleteMilestone(m.id)}
                            disabled={actionLoading}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition"
                          >
                            Mark Finished
                          </button>
                        )}

                        {/* Client: Inspect & Release button */}
                        {isClient && m.status === 'completed' && (
                          <button
                            onClick={() => handleApproveMilestone(m.id)}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Approve & Release</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Client Accept / Decline Banner if quote is SENT */}
                {isClient && activeQuote.status === 'sent' && (
                  <div className="p-4 bg-indigo-50 border-t border-indigo-100 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>Review & Fund Milestone Escrow</span>
                    </div>
                    <p className="text-[11px] text-indigo-700">
                      Your initial call-out fee earned you a <span className="font-bold">₦{activeQuote.diagnostic_credit_naira.toLocaleString()}</span> credit off labor.
                      Total to fund now: <span className="font-bold text-gray-900">₦{(activeQuote.net_payable_labor_naira + (activeQuote.materials_mode === 'mode_b_wallet' ? activeQuote.materials_estimate_naira : 0)).toLocaleString()}</span>.
                    </p>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleAcceptQuote(activeQuote.id)}
                        disabled={actionLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> <span>Accept & Fund Escrow</span>
                      </button>
                      <button
                        onClick={() => handleDeclineQuote(activeQuote.id)}
                        disabled={actionLoading}
                        className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-gray-300 transition"
                      >
                        Request Revision
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl space-y-2">
                <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-600">No Structured Quote Issued Yet</p>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  Once on-site diagnosis is performed, artisan builds the phased labor milestones with automatic 50% credit.
                </p>
              </div>
            )}
          </div>

          {/* 5. Client Review Form */}
          {isClient && (job.status === 'completed' || job.status === 'released' || job.status === 'paid') && !reviewSubmitted && (
            <form onSubmit={handleReviewSubmit} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h4 className="font-bold text-gray-900 text-base">Rate & Review Artisan</h4>
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
                placeholder="How was the artisan's punctuality, professionalism, and craftsmanship?"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                Submit Review
              </button>
            </form>
          )}

          {/* Job Details & Description */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Job Description & Location</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
            {job.location_address && (
              <p className="text-xs text-gray-500 pt-2 border-t flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{job.location_address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat & Real-Time Negotiation */}
        <div className="lg:col-span-5">
          <ChatBox jobId={job.id} currentUser={user} />
        </div>
      </div>

      {/* MODAL 1: Diagnosis Submission (Pro) */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">On-Site Diagnosis Report</h3>
              <button onClick={() => setShowDiagnosisModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Describe your physical inspection findings, root causes discovered, and required safety measures before work begins.
            </p>
            <form onSubmit={handleSubmitDiagnosis} className="space-y-4">
              <textarea
                rows={4}
                required
                value={diagnosisNotes}
                onChange={(e) => setDiagnosisNotes(e.target.value)}
                placeholder="e.g. Conducted multimeter continuity test on distribution board. Identified burnt neutral cable and damaged 32A breaker. Requires rewiring of sub-feeder and replacement of burnt breaker."
                className="w-full p-3.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiagnosisModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition"
                >
                  {actionLoading ? 'Saving...' : 'Save Diagnosis & Proceed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Structured Quote Builder (Pro) */}
      {showQuoteBuilder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-xl">Build Structured Quote</h3>
                <p className="text-xs text-gray-500 mt-0.5">Phased labor milestones, diagnostic credit, and materials mode</p>
              </div>
              <button onClick={() => setShowQuoteBuilder(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-6">
              {/* Labor Total & Diagnostic Credit Display */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Total Labor Fee (₦)</label>
                  <input
                    type="number"
                    min={5000}
                    step={1000}
                    value={quoteLaborTotal}
                    onChange={(e) => setQuoteLaborTotal(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[11px] text-emerald-800 font-bold">Automatic Diagnostic Credit (-50%):</span>
                  <span className="text-base font-black text-emerald-700">
                    -₦{Math.min(diagnosticCredit, quoteLaborTotal).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5">
                    Client net labor payable: ₦{(Math.max(0, quoteLaborTotal - diagnosticCredit)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Materials Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase">Materials Procurement Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setQuoteMaterialsMode('mode_a_client')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      quoteMaterialsMode === 'mode_a_client'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <p className="font-bold">Mode A: Client Purchases</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Pro provides itemized shopping list. Client buys directly.</p>
                  </div>
                  <div
                    onClick={() => setQuoteMaterialsMode('mode_b_wallet')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      quoteMaterialsMode === 'mode_b_wallet'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <p className="font-bold">Mode B: Materials Wallet</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Client funds materials into escrow. Pro purchases with receipts.</p>
                  </div>
                </div>
                {quoteMaterialsMode === 'mode_b_wallet' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Estimated Materials Cost (₦)</label>
                    <input
                      type="number"
                      min={0}
                      value={quoteMaterialsEstimate}
                      onChange={(e) => setQuoteMaterialsEstimate(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Milestones Builder */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Milestones Breakdown (Max 6, Milestone 1 &le; 30%)
                  </label>
                  {milestonesInput.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setMilestonesInput([...milestonesInput, { name: `Phase ${milestonesInput.length + 1}`, amount: 0, checklist: '' }])}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Phase
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {milestonesInput.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={m.name}
                          onChange={(e) => {
                            const updated = [...milestonesInput];
                            updated[idx].name = e.target.value;
                            setMilestonesInput(updated);
                          }}
                          placeholder="Phase name"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                        />
                        <input
                          type="number"
                          required
                          min={1000}
                          value={m.amount}
                          onChange={(e) => {
                            const updated = [...milestonesInput];
                            updated[idx].amount = Number(e.target.value);
                            setMilestonesInput(updated);
                          }}
                          placeholder="Amount ₦"
                          className="w-28 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-right"
                        />
                        {milestonesInput.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMilestonesInput(milestonesInput.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={m.checklist}
                        onChange={(e) => {
                          const updated = [...milestonesInput];
                          updated[idx].checklist = e.target.value;
                          setMilestonesInput(updated);
                        }}
                        placeholder="Deliverables checklist for this milestone"
                        className="w-full px-3 py-1 rounded-lg border border-gray-200 text-[11px] text-gray-600 bg-white"
                      />
                    </div>
                  ))}
                </div>

                {/* Milestone validation sum indicator */}
                {(() => {
                  const mSum = milestonesInput.reduce((acc, m) => acc + Number(m.amount), 0);
                  const isMatch = mSum === Number(quoteLaborTotal);
                  return (
                    <div className={`p-2.5 rounded-xl text-xs flex justify-between items-center font-bold ${
                      isMatch ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <span>Milestones Sum: ₦{mSum.toLocaleString()}</span>
                      <span>Target: ₦{quoteLaborTotal.toLocaleString()} ({isMatch ? 'Balanced ✓' : `Difference: ₦${(quoteLaborTotal - mSum).toLocaleString()}`})</span>
                    </div>
                  );
                })()}
              </div>

              {/* Warranty Days */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Workmanship Warranty (Days)</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={quoteWarrantyDays}
                  onChange={(e) => setQuoteWarrantyDays(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuoteBuilder(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition"
                >
                  {actionLoading ? 'Submitting Quote...' : 'Send Quote to Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
