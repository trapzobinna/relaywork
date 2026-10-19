import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { prosApi, categoriesApi } from '../api/endpoints';
import type { ProProfile, SkillCategory } from '../types';
import { MapView } from '../components/MapView';
import { TradeIcon } from '../components/TradeIcon';
import { Star, CheckCircle, Navigation, MapPin, Search, X, Clock, ShieldCheck, ArrowUpDown } from 'lucide-react';

const DEFAULT_CATEGORIES: SkillCategory[] = [
  { id: 1, name: 'Electrician', slug: 'electrician', icon: 'Zap' },
  { id: 2, name: 'Plumber', slug: 'plumber', icon: 'Wrench' },
  { id: 3, name: 'Carpenter & Woodwork', slug: 'carpenter', icon: 'Hammer' },
  { id: 4, name: 'AC Repair & HVAC', slug: 'ac-repair', icon: 'Wind' },
  { id: 5, name: 'Painter & Decorator', slug: 'painter', icon: 'Paintbrush' },
  { id: 6, name: 'Appliance Repair', slug: 'appliance-repair', icon: 'Tv' },
  { id: 7, name: 'Welder & Fabricator', slug: 'welder', icon: 'Flame' },
  { id: 8, name: 'Mason & Bricklayer', slug: 'mason', icon: 'Layers' },
];

export const ProSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pros, setPros] = useState<ProProfile[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  
  // Search and Sort
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Location and Filter Coordinates: Ikeja, Lagos default
  const [userLat, setUserLat] = useState<number>(6.6018);
  const [userLng, setUserLng] = useState<number>(3.3515);
  const [radiusKm, setRadiusKm] = useState<number>(30);
  const [minRating, setMinRating] = useState<number>(0);
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
        sort: sortBy,
      };
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      if (selectedCatId) {
        params.category_id = Number(selectedCatId);
      }
      let data = await prosApi.search(params);
      if (minRating > 0) {
        data = data.filter(p => (p.avg_rating || p.rating_avg || 0) >= minRating);
      }
      setPros(data);
    } catch (err) {
      console.error('Failed to load pros', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPros();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, selectedCatId, radiusKm, minRating, userLat, userLng]);

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
      {/* LinkedIn-style Search and Discovery Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pros by name, skill, or trade (e.g. Obinna, Electrician, Plumber)..."
            className="w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="recent">Newest Pros First</option>
            <option value="distance">Closest to Me</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

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
              max="60"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Rating: {minRating > 0 ? `${minRating}+ Stars` : 'Any'}
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full accent-amber-500"
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
              {pros.length} Available {pros.length === 1 ? 'Pro' : 'Pros'} {searchQuery ? `for "${searchQuery}"` : 'in Area'}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : pros.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
              <p className="text-gray-500 font-medium">No pros found {searchQuery ? `matching "${searchQuery}"` : `within ${radiusKm} km`}.</p>
              <button
                onClick={() => { setRadiusKm(60); setSearchQuery(''); setSelectedCatId(''); }}
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Reset filters & expand search
              </button>
            </div>
          ) : (
            pros.map((pro) => (
              <div
                key={pro.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="flex items-start space-x-4 flex-1">
                  {/* Pro Avatar with initials */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
                    {(pro.user_name || pro.business_name || 'PR').slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">
                        {pro.user_name || pro.business_name || pro.user?.full_name || 'Verified Pro'}
                      </h3>
                      {pro.verification_status === 'approved' ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Vetted
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" /> New Pro
                        </span>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-100/80">
                      <TradeIcon nameOrSlug={pro.skill_category_name || pro.category?.name} className="w-3.5 h-3.5 text-blue-600" />
                      <span>{pro.skill_category_name || pro.category?.name || 'Skilled Pro'}</span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 pt-0.5">{pro.bio || 'Experienced trade professional ready for local jobs.'}</p>

                    <div className="flex items-center space-x-4 text-xs font-medium text-gray-600 pt-1">
                      <span className="flex items-center text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                        {(pro.avg_rating || pro.rating_avg || 5.0).toFixed(1)} ({pro.total_reviews || pro.rating_count || 0} reviews)
                      </span>
                      <span>•</span>
                      <span className="flex items-center text-gray-500">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {pro.distance_km !== undefined ? `${pro.distance_km.toFixed(1)} km away` : pro.address_text || 'Nearby'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right flex sm:flex-col justify-between items-end border-t sm:border-t-0 pt-3 sm:pt-0 flex-shrink-0">
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
