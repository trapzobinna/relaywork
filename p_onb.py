p = "frontend/src/pages/ProOnboarding.tsx"
c = """import React, { useState, useEffect } from 'react';
import { prosApi, categoriesApi } from '../api/endpoints';
import { SkillCategory, ProProfile } from '../types';
import { useToast } from '../context/ToastContext';
import { MapPicker } from '../components/MapPicker';
import { Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const ProOnboarding: React.FC = () => {
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [hourlyRate, setHourlyRate] = useState<number>(5000);
  const [yearsExp, setYearsExp] = useState<number>(3);
  const [bio, setBio] = useState('');
  const [addressText, setAddressText] = useState('');
  const [lat, setLat] = useState<number>(6.6018);
  const [lng, setLng] = useState<number>(3.3515);
  const [bankName, setBankName] = useState('Access Bank');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    Promise.all([categoriesApi.getAll(), prosApi.getMyProfile().catch(() => null)])
      .then(([cats, myProf]) => {
        setCategories(cats);
        if (myProf) {
          setProfile(myProf);
          setBusinessName(myProf.business_name || '');
          setCategoryId(myProf.category_id || cats[0]?.id || 1);
          setHourlyRate(myProf.hourly_rate || 5000);
          setYearsExp(myProf.years_experience || 3);
          setBio(myProf.bio || '');
          setAddressText(myProf.address_text || '');
          setLat(myProf.latitude || 6.6018);
          setLng(myProf.longitude || 3.3515);
          setBankName(myProf.bank_name || 'Access Bank');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await prosApi.createProfile({
        business_name: businessName,
        category_id: categoryId,
        hourly_rate: hourlyRate,
        years_experience: yearsExp,
        bio,
        address_text: addressText,
        latitude: lat,
        longitude: lng,
        bank_name: bankName,
        account_number: accountNumber || undefined,
      });
      setProfile(updated);
      showToast('Pro profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await prosApi.uploadDocument(e.target.files[0]);
        showToast('Document uploaded successfully!', 'success');
        const refreshed = await prosApi.getMyProfile();
        setProfile(refreshed);
      } catch (err: any) {
        showToast('Failed to upload document', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Pro Professional Profile & Verification</h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete your profile, configure your payout bank, and upload verification ID for badge approval.
        </p>
      </div>

      {profile && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 ${
            profile.verification_status === 'approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : profile.verification_status === 'pending'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {profile.verification_status === 'approved' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : profile.verification_status === 'pending' ? (
            <Clock className="w-5 h-5 text-amber-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div className="text-sm">
            <span className="font-bold uppercase tracking-wide">
              Status: {profile.verification_status}
            </span>
            <p className="text-xs opacity-90">
              {profile.verification_status === 'approved'
                ? 'Your pro badge is active and your services appear at top rankings on the marketplace.'
                : 'Your profile and ID are currently under administrative review.'}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Trade & Location Details</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business / Brand Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Ade Electrical Solutions"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Primary Trade Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Base Hourly Rate (₦)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Years of Experience</label>
            <input
              type="number"
              value={yearsExp}
              onChange={(e) => setYearsExp(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bio / Overview</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell clients about your tools, specializations, past projects..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 uppercase">
            Service Location Pin ({lat.toFixed(4)}, {lng.toFixed(4)})
          </label>
          <p className="text-xs text-gray-500">Click on the map to set your base working location.</p>
          <MapPicker initialLat={lat} initialLng={lng} onLocationSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
        </div>

        <h2 className="text-xl font-bold text-gray-900 border-b pb-3 pt-4">Payout Bank Information (Paystack Escrow)</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Account Number {profile?.masked_account_number && `(Saved: ${profile.masked_account_number})`}
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={profile?.masked_account_number || "10-digit NUBAN"}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-md shadow-primary-600/20 text-sm"
          >
            {saving ? 'Saving Profile...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Proof of Identity & Verification Doc</h2>
        <p className="text-xs text-gray-500">
          Upload your NIN slip, Voter's Card, Driver's License, or Trade Certificate (PDF or Image).
        </p>

        <div className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-2xl p-8 text-center transition">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">Choose file or drag & drop</p>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleDocUpload}
            className="mt-3 text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
      </div>
    </div>
  );
};
"""
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print("ProOnboarding written")
