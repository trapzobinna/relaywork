import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/endpoints';
import type { SkillCategory } from '../types';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { ShieldCheck, Clock, CreditCard, Search, ArrowRight, Star, Sparkles, CheckCircle2 } from 'lucide-react';

const DEFAULT_CATEGORIES: SkillCategory[] = [
  { id: 1, name: 'Electrician', slug: 'electrician', icon: '⚡', description: 'Faults, wiring, fixtures & generator servicing' },
  { id: 2, name: 'Plumber', slug: 'plumber', icon: '🔧', description: 'Leaking pipes, borehole pumps & bathroom fixtures' },
  { id: 3, name: 'Carpenter', slug: 'carpenter', icon: '🪚', description: 'Furniture making, doors, roofing & cabinet repair' },
  { id: 4, name: 'AC Repair', slug: 'ac-repair', icon: '❄️', description: 'AC servicing, gas refilling & installations' },
  { id: 5, name: 'Painter', slug: 'painter', icon: '🎨', description: 'Interior/exterior wall painting & decorative screeding' },
  { id: 6, name: 'Auto Mechanic', slug: 'auto-mechanic', icon: '🚗', description: 'Car breakdown, engine diagnostic & brake overhaul' },
];

export const Home: React.FC = () => {
  const [categories, setCategories] = useState<SkillCategory[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    categoriesApi.getAll().then((data) => {
      if (data && data.length > 0) {
        setCategories(data);
      }
    }).catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCategory) params.append('category_id', selectedCategory);
    if (searchLocation) params.append('address', searchLocation);
    if (selectedCoords) {
      params.append('lat', selectedCoords.lat.toString());
      params.append('lng', selectedCoords.lng.toString());
    }
    navigate(`/pros?${params.toString()}`);
  };


  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Subtle Gradient Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold bg-blue-800/60 text-blue-200 border border-blue-400/30 backdrop-blur-md shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Nigeria's #1 On-Demand Skilled-Labor Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
            Connect with Verified Local <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Pros</span> in Minutes
          </h1>

          <p className="text-base sm:text-xl text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
            Find vetted electricians, plumbers, carpenters, and AC technicians near you. Upfront pricing, verified badges, and secure escrow payouts.
          </p>

          {/* Search Bar with Category & Address Autocomplete */}
          <form
            onSubmit={handleSearch}
            className="bg-white p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto border border-white/20 text-left"
          >
            <div className="flex-1 flex items-center px-4 py-2 sm:py-1 bg-gray-50 rounded-xl sm:rounded-2xl">
              <Search className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent py-2.5 text-gray-800 font-bold focus:outline-none text-sm cursor-pointer"
              >
                <option value="">All Trade Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <AddressAutocomplete
                value={searchLocation}
                onChange={setSearchLocation}
                onSelect={({ address, lat, lng }) => {
                  setSearchLocation(address);
                  setSelectedCoords({ lat, lng });
                }}
                placeholder="Your neighborhood / area..."
                className="py-2.5 bg-gray-50 rounded-xl sm:rounded-2xl border-0 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-7 py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center space-x-2 transition shadow-xl shadow-blue-600/30 text-sm cursor-pointer flex-shrink-0"
            >
              <span>Find Pros</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Mini Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-blue-200">
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-300" /> Vetted ID Verification</span>
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-300" /> Paystack Escrow Protection</span>
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-300" /> Direct Chat & Live Quotes</span>
          </div>
        </div>
      </section>

      {/* Trust & Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-blue-300 transition">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900">Vetted & Badge-Verified</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Every pro submits government ID and proof of trade expertise before approval by our platform review team.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-blue-300 transition">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900">Hyper-Local Geolocation</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Find workers within your specific neighborhood radius to minimize transport delays and ensure fast turnaround.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-blue-300 transition">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900">Split Escrow Payouts</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pay securely via Paystack split payments. Funds settle directly to the Pro's bank only once the job is completed.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Grid (Browse by Trade) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Browse by Trade</h2>
            <p className="text-gray-500 text-sm mt-1">Select a category to discover verified specialists near you</p>
          </div>
          <Link to="/pros" className="text-blue-600 font-bold text-sm hover:underline flex items-center">
            View all pros <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/pros?category_id=${c.id}`}
              className="bg-white p-6 rounded-3xl border border-gray-200/80 hover:border-blue-500 hover:shadow-xl transition flex flex-col items-center space-y-3 group text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-blue-50 text-gray-700 group-hover:text-blue-600 flex items-center justify-center text-3xl transition transform group-hover:scale-110">
                {c.icon || '🔧'}
              </div>
              <div>
                <span className="font-extrabold text-gray-900 text-sm group-hover:text-blue-600 transition block">
                  {c.name}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5 block">View specialists</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
