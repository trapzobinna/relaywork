import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prosApi, jobsApi } from '../api/endpoints';
import type { ProProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Star, ShieldCheck, ArrowLeft, Send, CheckCircle, MapPin, Zap, MessageSquare } from 'lucide-react';

import { AddressAutocomplete } from '../components/AddressAutocomplete';

export const ProDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Clean Uber-Style 1-Tap Booking fields
  const [locationAddress, setLocationAddress] = useState('Ikeja, Lagos');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 6.5957, lng: 3.3421 });
  const [quickNote, setQuickNote] = useState('');

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setLoading(true);
      prosApi
        .getById(Number(id))
        .then((data) => {
          setPro(data);
          if (data.address_text) {
            setLocationAddress(data.address_text);
          }
          if (data.latitude && data.longitude) {
            setSelectedCoords({ lat: data.latitude, lng: data.longitude });
          }
        })
        .catch((err) => {
          console.error('Failed to load pro:', err);
          showToast('Pro not found or server offline', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handle1TapBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pro) return;

    try {
      setBookingLoading(true);
      const categoryId = pro.skill_category_id || pro.category_id || 1;
      const categoryName = pro.skill_category_name || pro.category?.name || 'Trade';
      // Guarantee a valid positive budget — NaN or 0 would fail backend validation
      const rawRate = pro.hourly_rate ?? 10000;
      const estimatedRate = isNaN(Number(rawRate)) || Number(rawRate) <= 0 ? 10000 : Number(rawRate);

      const descText = quickNote && quickNote.trim().length >= 5
        ? `${quickNote.trim()} (Site Address: ${locationAddress})`
        : `Service request for ${categoryName} specialist at ${locationAddress}. Immediate assistance needed.`;

      // Always use pro.user_id (the User PK) — the backend resolves ProProfile.id too,
      // but user_id is definitive and avoids any ambiguity.
      const resolvedProId = pro.user_id || pro.id;

      const newJob = await jobsApi.create({
        pro_id: resolvedProId,
        skill_category_id: categoryId,
        title: `${categoryName} Service with ${pro.user_name || pro.user?.full_name || 'Pro'}`,
        description: descText,
        budget_amount: estimatedRate,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
        location_address: locationAddress,
      });

      showToast('Booking request sent directly to pro!', 'success');
      navigate(`/jobs/${newJob.id}`);
    } catch (err: any) {
      console.error('Booking error:', err);
      let errorMsg = 'Failed to place booking request';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || d.message).join(', ');
        } else {
          errorMsg = err.response.data.detail;
        }
      }
      showToast(errorMsg, 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-xs text-gray-400 font-medium">Loading Pro profile...</p>
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Pro Not Found</h2>
        <p className="text-gray-500 text-sm">The requested skilled trade profile could not be loaded.</p>
        <button
          onClick={() => navigate('/pros')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition"
        >
          Return to Pros Directory
        </button>
      </div>
    );
  }

  const displayName = pro.business_name || pro.user_name || pro.user?.full_name || 'Verified Pro Specialist';
  const displayCategory = pro.skill_category_name || pro.category?.name || 'Skilled Professional';
  const ratingValue = pro.avg_rating || pro.rating_avg || 5.0;
  const reviewCount = pro.total_reviews ?? pro.rating_count ?? 0;
  const jobsDone = pro.total_jobs_completed ?? 0;
  const ratePerHour = pro.hourly_rate || 10000;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/pros')}
        className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-900 font-semibold transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to search results</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {displayName}
              </h1>
              {pro.verification_status === 'approved' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> Vetted Badge
                </span>
              )}
            </div>
            <p className="text-lg text-blue-600 font-bold">{displayCategory}</p>
            <div className="flex items-center text-xs text-gray-500 space-x-1 pt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{pro.address_text || 'Ikeja & Greater Lagos Metro'} • Within {pro.service_radius_km || 25}km radius</span>
            </div>
          </div>

          <div className="sm:text-right bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <span className="text-xs text-gray-400 block uppercase font-bold">Standard Estimate</span>
            <span className="text-2xl font-black text-gray-900">
              ₦{ratePerHour.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 font-semibold"> / base task</span>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100 text-center">
          <div className="space-y-0.5">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Rating</span>
            <span className="text-lg font-black text-gray-900 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 mr-1" />
              {ratingValue.toFixed(1)}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Reviews</span>
            <span className="text-lg font-black text-gray-900">{reviewCount} Verified</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Jobs Settled</span>
            <span className="text-lg font-black text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-1 text-emerald-500" />
              {jobsDone}
            </span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <h3 className="font-bold text-gray-900 text-sm">Professional Background & Tools</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
            {pro.bio || 'Verified tradesperson equipped with modern trade tools and certified for domestic and commercial assignments.'}
          </p>
        </div>
      </div>

      {/* Booking Section — Auth Gated */}
      {!user ? (
        /* ── Guest: Sign-In CTA ── */
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Instant Booking</span>
            <h3 className="text-2xl font-black text-white mt-1">
              Request {displayName.split(' ')[0]} to your Location
            </h3>
            <p className="text-xs text-blue-200 mt-1">
              1-Tap request. Settle payment with escrow only after work is done.
            </p>
          </div>

          {/* Lock overlay */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 rounded-full">
              <svg className="w-7 h-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-base">Sign in to book this Pro</p>
              <p className="text-blue-200 text-xs mt-1">
                Create a free account or log in — it only takes 30 seconds.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`/login?redirect=/pros/${id}`}
                className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-extrabold py-3 px-5 rounded-2xl text-sm text-center transition shadow-lg shadow-blue-500/30"
              >
                Log In to Request
              </a>
              <a
                href={`/register?redirect=/pros/${id}`}
                className="flex-1 bg-white/15 hover:bg-white/25 text-white font-bold py-3 px-5 rounded-2xl text-sm text-center transition border border-white/20"
              >
                Create Free Account
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* ── Logged-In: 1-Tap Booking Form ── */
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Instant Booking</span>
            <h3 className="text-2xl font-black text-white mt-1">Request {displayName.split(' ')[0]} to your Location</h3>
            <p className="text-xs text-blue-200 mt-1">1-Tap request. Settle payment with escrow only after work is done.</p>
          </div>

          <form onSubmit={handle1TapBook} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-1">
                  Your Job Address (Search or Autocomplete)
                </label>
                <AddressAutocomplete
                  required
                  value={locationAddress}
                  onChange={setLocationAddress}
                  onSelect={({ address, lat, lng }) => {
                    setLocationAddress(address);
                    setSelectedCoords({ lat, lng });
                  }}
                  placeholder="e.g. 14 Allen Avenue, Ikeja"
                  className="py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-1">
                  Short Problem Description (Optional)
                </label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="e.g. Leaking bathroom pipe / Faulty breaker"
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={bookingLoading}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-base shadow-xl shadow-blue-500/30 flex items-center justify-center space-x-2 transition cursor-pointer transform active:scale-[0.99]"
            >
              {bookingLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span>Confirm & Request {displayName.split(' ')[0]} (₦{ratePerHour.toLocaleString()})</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
