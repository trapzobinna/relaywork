import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { prosApi, categoriesApi } from '../api/endpoints';
import type { ProProfile, SkillCategory } from '../types';
import { MapView } from '../components/MapView';
import { Star, CheckCircle, Navigation, MapPin } from 'lucide-react';

const DEFAULT_CATEGORIES: SkillCategory[] = [
  { id: 1, name: 'Electrician', slug: 'electrician', icon: '⚡' },
  { id: 2, name: 'Plumber', slug: 'plumber', icon: '🔧' },
  { id: 3, name: 'Carpenter', slug: 'carpenter', icon: '🪚' },
  { id: 4, name: 'AC Repair', slug: 'ac-repair', icon: '❄️' },
  { id: 5, name: 'Painter', slug: 'painter', icon: '🎨' },
  { id: 6, name: 'Auto Mechanic', slug: 'auto-mechanic', icon: '🚗' },
];

export const ProSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pros, setPros] = useState<ProProfile[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  
  // Default coordinates: Ikeja, Lagos
  const [userLat, setUserLat] = useState<number>(6.6018);
  const [userLng, setUserLng] = useState<number>(3.3515);
  const [radiusKm, setRadiusKm] = useState<number>(30);
  const categoryIdParam = searchParams.get('category_id');
  const [selectedCatId, setSelectedCatId] = useState<string>(categoryIdParam || '');

  useEffect(() => {
    categoriesApi.getAll().then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    }).catch(console.error);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.log('Location default to Lagos', err)
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
      {/* Filter Controls Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-auto flex-1 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trade Category</label>
            <select
              value={selectedCatId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
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
              max="60"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span>Location: {userLat.toFixed(3)}, {userLng.toFixed(3)}</span>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Pro Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-900">
              {pros.length} Verified {pros.length === 1 ? 'Pro' : 'Pros'} in Area
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : pros.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
              <p className="text-gray-500 font-medium">No verified pros found within {radiusKm} km.</p>
              <button
                onClick={() => setRadiusKm(60)}
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Expand search radius to 60km
              </button>
            </div>
          ) : (
            pros.map((pro) => (
              <div
                key={pro.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-lg text-gray-900">
                      {pro.business_name || pro.user?.full_name || 'Verified Pro'}
                    </h3>
                    {pro.verification_status === 'approved' && (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Vetted
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-blue-600">{pro.category?.name || 'Skilled Pro'}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{pro.bio || 'Experienced trade professional ready for local jobs.'}</p>

                  <div className="flex items-center space-x-4 text-xs font-medium text-gray-600 pt-2">
                    <span className="flex items-center text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400 mr-1" />
                      {(pro.rating_avg || 5.0).toFixed(1)} ({pro.rating_count || 0} reviews)
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
                      ₦{(pro.hourly_rate || 5000).toLocaleString()}
                    </span>
                  </div>
                  <Link
                    to={`/pros/${pro.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm mt-3"
                  >
                    View & Request
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Leaflet Map */}
        <div className="lg:col-span-5 h-[500px] lg:h-[600px] sticky top-24">
          <MapView center={[userLat, userLng]} pros={pros} />
        </div>
      </div>
    </div>
  );
};
