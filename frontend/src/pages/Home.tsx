import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/endpoints';
import type { SkillCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { TradeIcon } from '../components/TradeIcon';
import { 
  ShieldCheck, 
  Clock, 
  CreditCard, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  LayoutDashboard, 
  Briefcase, 
  Camera, 
  ArrowLeftRight,
  TrendingUp,
  MapPin,
  FileText
} from 'lucide-react';

const DEFAULT_CATEGORIES: SkillCategory[] = [
  { id: 1, name: 'Electrician', slug: 'electrician', icon: 'Zap', description: 'Faults, wiring, fixtures & generator servicing' },
  { id: 2, name: 'Plumber', slug: 'plumber', icon: 'Wrench', description: 'Leaking pipes, borehole pumps & bathroom fixtures' },
  { id: 3, name: 'Carpenter & Woodwork', slug: 'carpenter', icon: 'Hammer', description: 'Furniture making, doors, roofing & cabinet repair' },
  { id: 4, name: 'AC Repair & HVAC', slug: 'ac-repair', icon: 'Wind', description: 'AC servicing, gas refilling & installations' },
  { id: 5, name: 'Painter & Decorator', slug: 'painter', icon: 'Paintbrush', description: 'Interior/exterior wall painting & decorative screeding' },
  { id: 6, name: 'Appliance Repair', slug: 'appliance-repair', icon: 'Tv', description: 'Washing machines, refrigerators & electronics' },
  { id: 7, name: 'Welder & Fabricator', slug: 'welder', icon: 'Flame', description: 'Burglar proofs, iron gates & metal fabrication' },
  { id: 8, name: 'Mason & Bricklayer', slug: 'mason', icon: 'Layers', description: 'Tiling, plastering, interlocking & masonry' },
];

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<SkillCategory[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
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

        {/* PRO LOGGED-IN HERO */}
        {user?.role === 'pro' && !showClientSearch ? (
          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>RelayWork Pro Partner Portal</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
              Welcome back,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                {user.full_name?.split(' ')[0] || 'Partner'}
              </span>
            </h1>

            <p className="text-base sm:text-xl text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              Your trade operations center. Track your incoming job requests, receive client travel/inspection fees, manage your verified portfolio, and get paid with secure Paystack escrow.
            </p>

            {/* Quick Pro Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/pro-dashboard"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-8 py-4 rounded-2xl flex items-center justify-center space-x-2 transition shadow-xl shadow-blue-600/30 text-sm cursor-pointer"
              >
                <LayoutDashboard className="w-5 h-5 mr-1" />
                <span>Open Pro Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/jobs"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-7 py-4 rounded-2xl flex items-center justify-center space-x-2 transition backdrop-blur-md text-sm cursor-pointer"
              >
                <Briefcase className="w-5 h-5 mr-1" />
                <span>Job Requests & Orders</span>
              </Link>

              <Link
                to="/pro/onboarding"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-7 py-4 rounded-2xl flex items-center justify-center space-x-2 transition backdrop-blur-md text-sm cursor-pointer"
              >
                <Camera className="w-5 h-5 mr-1" />
                <span>Portfolio & Verification</span>
              </Link>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClientSearch(true)}
                className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white underline font-semibold transition cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Need to hire another pro for your site? Switch to Client Search Mode</span>
              </button>
            </div>
          </div>
        ) : (
          /* CLIENT SEARCH HERO */
          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            {user?.role === 'pro' && (
              <div className="bg-blue-800/80 border border-blue-400/30 rounded-full px-4 py-1.5 inline-flex items-center gap-2 text-xs font-bold text-blue-200 mb-2">
                <span>Client Search Mode Active</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowClientSearch(false)}
                  className="underline text-teal-300 hover:text-teal-200 cursor-pointer"
                >
                  Return to Pro Partner View &rarr;
                </button>
              </div>
            )}

            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold bg-blue-800/60 text-blue-200 border border-blue-400/30 backdrop-blur-md shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Vetted Skilled-Labor & Artisan Marketplace</span>
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
                      {c.name}
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
        )}
      </section>

      {/* Trust & Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {user?.role === 'pro' && !showClientSearch ? (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-blue-300 transition">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Guaranteed Escrow Payouts</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Client funds are locked securely in Paystack escrow before you commence work. Get paid directly to your bank account with zero payment chasing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-blue-300 transition">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Distance & Travel Coverage</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Define your operating radius. Diagnostic site visits and transport allowances are factored in upfront so travel costs never eat into your margin.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center space-y-4 hover:border-blue-300 transition">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Custom Quotes for Massive Jobs</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Whether a 30-minute repair or a massive multi-day construction project, negotiate labor, materials, and staged milestone payments in chat.
              </p>
            </div>
          </div>
        ) : (
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
        )}
      </section>

      {/* Categories Grid (Browse by Trade) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {user?.role === 'pro' && !showClientSearch ? 'Marketplace Trade Categories' : 'Browse by Trade'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {user?.role === 'pro' && !showClientSearch
                ? 'RelayWork connects clients with vetted specialists across 8 core trade sectors'
                : 'Select a category to discover verified specialists near you'}
            </p>
          </div>
          <Link to="/pros" className="text-blue-600 font-bold text-sm hover:underline flex items-center">
            {user?.role === 'pro' && !showClientSearch ? 'Browse live marketplace' : 'View all pros'}{' '}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/pros?category_id=${c.id}`}
              className="bg-white p-5 rounded-2xl border border-gray-200/90 hover:border-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col items-center space-y-3 group text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-200 text-slate-700 group-hover:text-blue-600 flex items-center justify-center transition-all duration-200 group-hover:scale-105">
                <TradeIcon nameOrSlug={c.slug || c.name || c.icon} className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-xs group-hover:text-blue-600 transition block">
                  {c.name}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">Browse pros</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
