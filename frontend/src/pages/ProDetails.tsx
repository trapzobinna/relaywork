import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prosApi, jobsApi, portfolioApi, pricingApi } from '../api/endpoints';
import type { ProProfile, PricingEstimate, CatalogItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Star, ShieldCheck, ArrowLeft, Send, CheckCircle, MapPin,
  Zap, MessageSquare, Clock, AlertTriangle, Check, Layers,
  Compass, Info, ChevronRight, FileCheck, Shield
} from 'lucide-react';
import { TradeIcon } from '../components/TradeIcon';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

export const ProDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [portfolioPhotos, setPortfolioPhotos] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Booking mode: 'diagnostic_quote' vs 'quick_fix'
  const [bookingMode, setBookingMode] = useState<'diagnostic_quote' | 'quick_fix'>('diagnostic_quote');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);

  // Address and Coordinates
  const [locationAddress, setLocationAddress] = useState('Ikeja, Lagos');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 6.5957, lng: 3.3421 });
  const [quickNote, setQuickNote] = useState('');

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        prosApi.getById(Number(id)),
        portfolioApi.getByPro(Number(id)).catch(() => [])
      ])
        .then(([data, photos]) => {
          setPro(data);
          setPortfolioPhotos(photos || []);
          if (data.address_text) {
            setLocationAddress(data.address_text);
          }
          if (data.latitude && data.longitude) {
            setSelectedCoords({ lat: data.latitude, lng: data.longitude });
          }

          // Fetch catalog items for this pro's category
          const catId = data.skill_category_id || data.category_id;
          if (catId) {
            pricingApi.getCatalogItems(catId)
              .then(items => {
                setCatalogItems(items || []);
                if (items && items.length > 0) {
                  setSelectedCatalogItem(items[0]);
                }
              })
              .catch(err => console.error('Failed to load catalog:', err));
          }
        })
        .catch((err) => {
          console.error('Failed to load pro:', err);
          showToast('Pro not found or server offline', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Re-estimate call-out fee when coords or emergency changes
  useEffect(() => {
    if (pro) {
      pricingApi.getEstimate({
        client_lat: selectedCoords.lat,
        client_lng: selectedCoords.lng,
        pro_id: pro.id,
        skill_category_id: pro.skill_category_id || pro.category_id,
        is_emergency: isEmergency
      })
        .then(est => setPricingEstimate(est))
        .catch(err => console.error('Failed to estimate pricing:', err));
    }
  }, [pro, selectedCoords, isEmergency]);

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pro) return;

    try {
      setBookingLoading(true);
      const categoryId = pro.skill_category_id || pro.category_id || 1;
      const categoryName = pro.skill_category_name || pro.category?.name || 'Trade';
      const resolvedProId = pro.user_id || pro.id;

      let jobTitle = '';
      let descText = '';
      let budgetAmount = 10000;
      let catalogItemId = undefined;

      if (bookingMode === 'quick_fix' && selectedCatalogItem) {
        jobTitle = `${selectedCatalogItem.name} — ${pro.user_name || 'Artisan'}`;
        budgetAmount = selectedCatalogItem.labor_naira;
        catalogItemId = selectedCatalogItem.id;
        descText = quickNote && quickNote.trim().length >= 5
          ? `${quickNote.trim()} [Standard Task: ${selectedCatalogItem.name} | Site Address: ${locationAddress}]`
          : `Standard fixed-price service: ${selectedCatalogItem.name} at ${locationAddress}. Parts allowance: ₦${selectedCatalogItem.parts_allowance_naira.toLocaleString()}.`;
      } else {
        jobTitle = `Inspection & Diagnosis: ${categoryName} — ${pro.user_name || 'Artisan'}`;
        budgetAmount = pricingEstimate?.exact_call_out_naira || 6000;
        descText = quickNote && quickNote.trim().length >= 5
          ? `${quickNote.trim()} [Diagnostic Call-Out | Site Address: ${locationAddress}]`
          : `Diagnostic arrival & inspection for ${categoryName} issue at ${locationAddress}. Artisan to conduct on-site assessment and provide structured milestone quote.`;
      }

      const newJob = await jobsApi.create({
        pro_id: resolvedProId,
        skill_category_id: categoryId,
        title: jobTitle,
        description: descText,
        budget_amount: budgetAmount,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
        location_address: locationAddress,
        job_type: bookingMode === 'quick_fix' ? 'quick_fix' : 'quoted',
        is_emergency: isEmergency,
        catalog_item_id: catalogItemId
      });

      showToast('Booking request sent directly to artisan!', 'success');
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
        <p className="text-xs text-gray-400 font-medium">Loading Pro profile & pricing engine...</p>
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
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {displayName}
              </h1>
              {pro.verification_status === 'approved' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> Vetted Badge
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <Clock className="w-4 h-4 mr-1 text-slate-500" /> Under Review
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-base text-blue-600 font-bold pt-0.5">
              <TradeIcon nameOrSlug={displayCategory} className="w-4 h-4 text-blue-600" />
              <span>{displayCategory}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500 space-x-1 pt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{pro.address_text || 'Lagos Metro'} • Servicing within {pro.service_radius_km || 25}km</span>
            </div>
          </div>

          {/* Pricing Highlight Pill */}
          <div className="sm:text-right bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100/80 shadow-xs">
            <span className="text-[11px] text-gray-500 block uppercase font-bold tracking-wider">Dynamic Call-Out</span>
            <span className="text-2xl font-black text-gray-900">
              {pricingEstimate?.exact_call_out_naira
                ? `₦${pricingEstimate.exact_call_out_naira.toLocaleString()}`
                : pricingEstimate?.display_range || '₦6,000 – ₦9,500'}
            </span>
            <div className="flex items-center sm:justify-end gap-1 text-[11px] text-emerald-700 font-bold mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>50% Credited to Quote</span>
            </div>
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
          <h3 className="font-bold text-gray-900 text-sm">Professional Background & Equipment</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
            {pro.bio || 'Verified tradesperson equipped with modern trade tools and certified for domestic and commercial assignments.'}
          </p>
        </div>

        {/* Dynamic Distance & Travel Calculation Banner */}
        {pricingEstimate && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">
                  {pricingEstimate.estimated_road_km ? `${pricingEstimate.estimated_road_km} km away` : 'Within service radius'} • ETA ~{pricingEstimate.estimated_minutes || 25} mins
                </p>
                <p className="text-gray-500 text-[11px]">
                  Pricing status: <span className="font-semibold text-blue-700">{pricingEstimate.surge_reason || 'Standard Urban Transit'}</span> ({pricingEstimate.surge_multiplier}x)
                </p>
              </div>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-emerald-700 font-bold text-[11px] flex items-center gap-1.5 self-start sm:self-auto">
              <FileCheck className="w-3.5 h-3.5" />
              <span>50% Diagnostic Credit: ₦{(pricingEstimate.exact_call_out_naira ? pricingEstimate.exact_call_out_naira * 0.5 : 3000).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Portfolio / Past Work Photos */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-lg">Portfolio & Real Job Photos</h3>
            <span className="text-xs font-semibold text-gray-500">{portfolioPhotos.length} Photos</span>
          </div>
          {portfolioPhotos.length > 0 ? (
            <div className="flex overflow-x-auto hide-scrollbar space-x-4 pb-2 snap-x">
              {portfolioPhotos.map((photo: any) => (
                <div key={photo.id} className="relative group rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 aspect-[4/5] min-w-[200px] sm:min-w-[240px] snap-center">
                  <img src={photo.image_url} alt={photo.caption || 'Past work'} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8 text-white text-xs font-bold">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm font-medium">
              No portfolio photos uploaded yet.
            </div>
          )}
        </div>
      </div>

      {/* Booking Form Section */}
      {!user ? (
        /* Guest Sign-in Banner */
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Escrow Protected Booking</span>
            <h3 className="text-2xl font-black text-white mt-1">Book {displayName.split(' ')[0]} with Escrow Safety</h3>
            <p className="text-xs text-blue-200 mt-1">
              Funds held securely in platform escrow until work is delivered and approved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={`/login?redirect=/pros/${id}`}
              className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-extrabold py-3 px-5 rounded-2xl text-sm text-center transition shadow-lg shadow-blue-500/30"
            >
              Log In to Book
            </a>
            <a
              href={`/register?redirect=/pros/${id}`}
              className="flex-1 bg-white/15 hover:bg-white/25 text-white font-bold py-3 px-5 rounded-2xl text-sm text-center transition border border-white/20"
            >
              Create Free Account
            </a>
          </div>
        </div>
      ) : (
        /* Logged-In Booking Form with Job Type Selector */
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Step 1 of 2 • Booking Type</span>
              <h3 className="text-2xl font-black text-white mt-0.5">Select Service Mode</h3>
            </div>
            {/* Emergency Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 self-start sm:self-auto">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Priority Dispatch (1.4x)
              </span>
            </label>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tab 1: Diagnostic Quote */}
            <div
              onClick={() => setBookingMode('diagnostic_quote')}
              className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                bookingMode === 'diagnostic_quote'
                  ? 'bg-blue-600/25 border-blue-400 ring-2 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" /> Massive / Custom Repairs
                  </span>
                  {bookingMode === 'diagnostic_quote' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h4 className="text-base font-bold text-white">On-Site Diagnosis & Structured Quote</h4>
                <p className="text-xs text-blue-200/80 mt-1 leading-relaxed">
                  Artisan travels to your site, performs safety inspection, logs diagnostic photos, and creates structured labor milestones.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-extrabold text-white">
                  ₦{(pricingEstimate?.exact_call_out_naira || 6000).toLocaleString()} Call-Out
                </span>
                <span className="text-emerald-400 font-bold">50% Credited to Labor</span>
              </div>
            </div>

            {/* Tab 2: Fixed Rate Card */}
            <div
              onClick={() => setBookingMode('quick_fix')}
              className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                bookingMode === 'quick_fix'
                  ? 'bg-blue-600/25 border-blue-400 ring-2 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Quick Fix Rate Card
                  </span>
                  {bookingMode === 'quick_fix' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h4 className="text-base font-bold text-white">Pre-Priced Standard Tasks</h4>
                <p className="text-xs text-blue-200/80 mt-1 leading-relaxed">
                  Standard routine fixes (e.g. Socket swap, tap replacement, AC gas refill) with fixed labor rates and parts allowances.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-extrabold text-white">
                  {selectedCatalogItem ? `₦${selectedCatalogItem.labor_naira.toLocaleString()} Labor` : 'Standard Rates'}
                </span>
                <span className="text-purple-300 font-semibold">{catalogItems.length} Trade Items</span>
              </div>
            </div>
          </div>

          {/* Quick-Fix Catalog Item Selector if mode is quick_fix */}
          {bookingMode === 'quick_fix' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                Select Pre-Priced Service Item:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {catalogItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCatalogItem(item)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      selectedCatalogItem?.id === item.id
                        ? 'bg-purple-600/30 border-purple-400 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold">{item.name}</p>
                      <span className="text-xs font-extrabold text-amber-300 whitespace-nowrap ml-2">
                        ₦{item.labor_naira.toLocaleString()}
                      </span>
                    </div>
                    {item.included_parts && (
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                        Inc: {item.included_parts}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking Form Inputs */}
          <form onSubmit={handleBookService} className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-1">
                  Your Job Site Address
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
                  Task Notes & Details
                </label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Describe the issue or parts needed..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                />
              </div>
            </div>

            {/* Escrow Transparency Note */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-400/20 text-xs text-blue-200 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">How RelayWork Escrow Works: </span>
                {bookingMode === 'diagnostic_quote' ? (
                  <span>
                    Your call-out fee is held in escrow until the artisan arrives and completes diagnosis. When a full quote is accepted, 50% of the call-out fee is credited back directly against the labor cost!
                  </span>
                ) : (
                  <span>
                    Labor payment is held safely in escrow. Artisan only gets paid when you confirm the service has been completed satisfactorily.
                  </span>
                )}
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
                  <span>
                    {bookingMode === 'diagnostic_quote'
                      ? `Book Inspection & Diagnosis (₦${(pricingEstimate?.exact_call_out_naira || 6000).toLocaleString()})`
                      : `Book ${selectedCatalogItem?.name || 'Quick Fix'} (₦${(selectedCatalogItem?.labor_naira || 8000).toLocaleString()})`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
