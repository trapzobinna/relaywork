p_search = "frontend/src/pages/ProSearch.tsx"
c_search = """import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { prosApi, categoriesApi } from '../api/endpoints';
import { ProProfile, SkillCategory } from '../types';
import { MapView } from '../components/MapView';
import { Star, CheckCircle, Navigation, MapPin } from 'lucide-react';

export const ProSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pros, setPros] = useState<ProProfile[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [userLat, setUserLat] = useState<number>(6.6018);
  const [userLng, setUserLng] = useState<number>(3.3515);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const categoryIdParam = searchParams.get('category_id');
  const [selectedCatId, setSelectedCatId] = useState<string>(categoryIdParam || '');

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(console.error);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.log('Location default to Ikeja', err)
      );
    }
  }, []);

  const fetchPros = async () => {
    try {
      setLoading(true);
      const params: any = {
        lat: userLat,
        lng: userLng,
        radius_km: radiusKm,
      };
      if (selectedCatId) {
        params.category_id = Number(selectedCatId);
      }
      const data = await prosApi.search(params);
      setPros(data);
    } catch (err) {
      console.error('Failed to load pros', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPros();
  }, [selectedCatId, radiusKm, userLat, userLng]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId);
    if (catId) {
      setSearchParams({ category_id: catId });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-auto flex-1 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trade Category</label>
            <select
              value={selectedCatId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Radius: {radiusKm} km
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-primary-600"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
          <Navigation className="w-4 h-4 text-primary-600" />
          <span>Location: {userLat.toFixed(3)}, {userLng.toFixed(3)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-900">
              {pros.length} Verified {pros.length === 1 ? 'Pro' : 'Pros'} Nearby
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : pros.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
              <p className="text-gray-500">No verified pros found in this radius.</p>
              <button
                onClick={() => setRadiusKm(50)}
                className="mt-3 text-primary-600 font-bold text-sm hover:underline"
              >
                Expand search radius to 50km
              </button>
            </div>
          ) : (
            pros.map((pro) => (
              <div
                key={pro.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-primary-500 hover:shadow-md transition flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-lg text-gray-900">
                      {pro.business_name || pro.user?.full_name}
                    </h3>
                    {pro.verification_status === 'approved' && (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Vetted
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-primary-600">{pro.category?.name}</p>

                  <p className="text-xs text-gray-500 line-clamp-2">{pro.bio || 'Experienced trade professional ready for local jobs.'}</p>

                  <div className="flex items-center space-x-4 text-xs font-medium text-gray-600 pt-2">
                    <span className="flex items-center text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400 mr-1" />
                      {pro.rating_avg.toFixed(1)} ({pro.rating_count} reviews)
                    </span>
                    <span>•</span>
                    <span className="flex items-center text-gray-500">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      {pro.distance_km !== undefined ? `${pro.distance_km.toFixed(1)} km away` : pro.address_text || 'Nearby'}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right flex sm:flex-col justify-between items-end border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div>
                    <span className="text-xs text-gray-400 block">Rate from</span>
                    <span className="text-lg font-extrabold text-gray-900">
                      ₦{pro.hourly_rate?.toLocaleString() || 'Negotiable'}
                    </span>
                  </div>
                  <Link
                    to={`/pros/${pro.id}`}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
                  >
                    View & Request
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-5 h-[500px] lg:h-[650px] sticky top-24">
          <MapView center={[userLat, userLng]} pros={pros} />
        </div>
      </div>
    </div>
  );
};
"""
with open(p_search, 'w', encoding='utf-8') as f:
    f.write(c_search)

p_det = "frontend/src/pages/ProDetails.tsx"
c_det = """import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prosApi, jobsApi } from '../api/endpoints';
import { ProProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Star, ShieldCheck, ArrowLeft, Send } from 'lucide-react';

export const ProDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      prosApi
        .getById(Number(id))
        .then(setPro)
        .catch((err) => {
          console.error(err);
          showToast('Pro not found', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleRequestJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!pro) return;

    try {
      setSubmitting(true);
      const newJob = await jobsApi.create({
        pro_id: pro.id,
        category_id: pro.category_id,
        title: jobTitle,
        description: jobDesc,
        latitude: pro.latitude,
        longitude: pro.longitude,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      });
      showToast('Job request sent successfully!', 'success');
      navigate(`/jobs/${newJob.id}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to submit job request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <p className="text-gray-500">Pro profile not found or unavailable.</p>
        <button onClick={() => navigate('/pros')} className="text-primary-600 font-bold hover:underline">
          Return to search
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <button
        onClick={() => navigate('/pros')}
        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to search</span>
      </button>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-extrabold text-gray-900">
                {pro.business_name || pro.user?.full_name}
              </h1>
              {pro.verification_status === 'approved' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Verified Pro
                </span>
              )}
            </div>
            <p className="text-lg text-primary-600 font-semibold mt-1">{pro.category?.name}</p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-gray-400 block uppercase font-bold">Standard Rate</span>
            <span className="text-2xl font-black text-gray-900">
              ₦{pro.hourly_rate?.toLocaleString() || 'Negotiable'}
            </span>
            <span className="text-xs text-gray-500"> / hour</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100 text-center">
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase block">Rating</span>
            <span className="text-lg font-bold text-gray-900 flex items-center justify-center mt-0.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 mr-1" />
              {pro.rating_avg.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase block">Reviews</span>
            <span className="text-lg font-bold text-gray-900">{pro.rating_count}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase block">Experience</span>
            <span className="text-lg font-bold text-gray-900">{pro.years_experience || 3}+ yrs</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">About this Specialist</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
            {pro.bio || 'Professional trade contractor with verified background and certifications on file.'}
          </p>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={() => setRequestModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary-600/30 flex items-center space-x-2 text-sm"
          >
            <Send className="w-4 h-4" />
            <span>Request a Job with {pro.user?.full_name?.split(' ')[0]}</span>
          </button>
        </div>
      </div>

      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 animate-scale-up">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900">Request Service Job</h3>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestJob} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Job Title / Summary
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fix tripping circuit breaker in kitchen"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue, work required, location specifics..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Preferred Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-md shadow-primary-600/20"
                >
                  {submitting ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
"""
with open(p_det, 'w', encoding='utf-8') as f:
    f.write(c_det)

print("ProSearch & ProDetails written")
