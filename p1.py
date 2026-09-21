import os

p = "frontend/src/pages/Home.tsx"
c = """import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/endpoints';
import { SkillCategory } from '../types';
import { ShieldCheck, Clock, CreditCard, Search, ArrowRight } from 'lucide-react';

export const Home: React.FC = () => {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      navigate(`/pros?category_id=${selectedCategory}`);
    } else {
      navigate('/pros');
    }
  };

  return (
    <div className="space-y-16 pb-16">
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-950 text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-primary-700/50 text-primary-200 border border-primary-500/30">
            ⚡ Nigeria's Trusted Skilled-Labor Network
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Connect with Verified Local Pros in Minutes
          </h1>
          <p className="text-lg sm:text-xl text-primary-200 max-w-2xl mx-auto">
            Find vetted electricians, plumbers, carpenters, and AC technicians near you. Upfront pricing, verified badges, and secure escrow payments.
          </p>

          <form
            onSubmit={handleSearch}
            className="bg-white p-2 sm:p-3 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
          >
            <div className="flex-1 flex items-center px-3 bg-gray-50 rounded-xl">
              <Search className="w-5 h-5 text-gray-400 mr-2" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent py-3 text-gray-800 font-medium focus:outline-none text-sm"
              >
                <option value="">All Trade Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-primary-600/30"
            >
              <span>Find Pros</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Vetted & Badge-Verified</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Every pro submits government ID and proof of trade expertise before approval by our admin review team.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Hyper-Local Geolocation</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Find workers within your specific neighborhood radius to minimize transport delays and ensure fast turnaround.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Split Escrow Payouts</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pay securely via Paystack split payments. Funds are disbursed directly to the Pro's bank once the job is completed.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse by Trade</h2>
            <p className="text-gray-500 text-sm mt-1">Select a category to discover available specialists nearby</p>
          </div>
          <Link to="/pros" className="text-primary-600 font-semibold text-sm hover:underline flex items-center">
            View all pros <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/pros?category_id=${c.id}`}
              className="bg-white p-5 rounded-2xl border border-gray-200/80 hover:border-primary-500 hover:shadow-md transition text-center flex flex-col items-center space-y-3 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-primary-50 text-gray-700 group-hover:text-primary-600 flex items-center justify-center text-2xl transition">
                {c.icon || '🔧'}
              </div>
              <span className="font-semibold text-gray-800 text-sm group-hover:text-primary-600 transition">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
"""
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print("Home written")
