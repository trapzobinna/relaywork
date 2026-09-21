import React, { useState, useEffect } from 'react';
import { prosApi, categoriesApi } from '../api/endpoints';
import type { SkillCategory, ProProfile } from '../types';
import { useToast } from '../context/ToastContext';
import { MapPicker } from '../components/MapPicker';
import { Upload, CheckCircle, AlertCircle, Clock, ShieldCheck, MapPin } from 'lucide-react';

export const ProOnboarding: React.FC = () => {
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const [categoryId, setCategoryId] = useState<number>(1);
  const [serviceRadius, setServiceRadius] = useState<number>(25);
  const [bio, setBio] = useState('');
  const [addressText, setAddressText] = useState('Ikeja, Lagos');
  const [lat, setLat] = useState<number>(6.6018);
  const [lng, setLng] = useState<number>(3.3515);
  const [bankName, setBankName] = useState('GTBank');
  const [bankCode, setBankCode] = useState('058');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    Promise.all([categoriesApi.getAll(), prosApi.getMyProfile().catch(() => null)])
      .then(([cats, myProf]) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
        if (myProf) {
          setProfile(myProf);
          setCategoryId(myProf.skill_category_id || myProf.category_id || (cats[0]?.id ?? 1));
          setBio(myProf.bio || '');
          setServiceRadius(myProf.service_radius_km || 25);
          setAddressText(myProf.address_text || 'Ikeja, Lagos');
          setLat(myProf.latitude || 6.6018);
          setLng(myProf.longitude || 3.3515);
          setBankName(myProf.bank_name || 'GTBank');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await prosApi.createProfile({
        skill_category_id: Number(categoryId),
        bio,
        service_radius_km: Number(serviceRadius),
        latitude: Number(lat),
        longitude: Number(lng),
        address_text: addressText,
        bank_name: bankName,
        bank_code: bankCode,
        account_number: accountNumber || undefined,
        account_name: accountName || undefined,
      });
      setProfile(updated);
      showToast('Pro profile updated successfully! Submitted for verification.', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploading(true);
        const res = await prosApi.uploadDocument(e.target.files[0]);
        showToast('Document uploaded successfully!', 'success');
        if (res.profile) {
          setProfile(res.profile);
        } else {
          const refreshed = await prosApi.getMyProfile();
          setProfile(refreshed);
        }
      } catch (err: any) {
        showToast(err.response?.data?.detail || 'Failed to upload document', 'error');
      } finally {
        setUploading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-xs text-gray-400 font-medium">Loading Pro profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pro Profile & Identity Verification</h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete your trade information, base location pin, payout bank, and upload ID to receive your Vetted Badge.
        </p>
      </div>

      {/* Verification Status Banner */}
      {profile && (
        <div
          className={`p-5 rounded-2xl border flex items-center space-x-3.5 ${
            profile.verification_status === 'approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : profile.verification_status === 'pending'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {profile.verification_status === 'approved' ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          ) : profile.verification_status === 'pending' ? (
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          )}
          <div>
            <span className="font-extrabold text-sm uppercase tracking-wider">
              Verification Status: {profile.verification_status}
            </span>
            <p className="text-xs opacity-90 mt-0.5">
              {profile.verification_status === 'approved'
                ? 'Your pro badge is active! You appear in top search results.'
                : 'Your profile and verification documents are under review by our governance team.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Details Form */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Trade & Location Details</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Primary Trade Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Service Radius ({serviceRadius} km)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={serviceRadius}
              onChange={(e) => setServiceRadius(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Base Workshop / Area Address</label>
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="e.g. 14 Allen Avenue, Ikeja, Lagos"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bio / Overview of Expertise</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your equipment, years of trade experience, warranties, and specializations..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Map Pin Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 uppercase">
            Service Location Pin ({lat.toFixed(4)}, {lng.toFixed(4)})
          </label>
          <p className="text-xs text-gray-500">Click on the map below to set your exact base operating location.</p>
          <MapPicker initialLat={lat} initialLng={lng} onLocationSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
        </div>

        {/* Bank Subaccount Information */}
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3 pt-4">Payout Bank Information (Paystack Escrow)</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Access Bank, GTBank, Zenith"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-2xl transition shadow-md shadow-blue-600/20 text-sm"
          >
            {saving ? 'Saving Profile...' : 'Save Profile & Settings'}
          </button>
        </div>
      </form>

      {/* Proof of Identity Document Upload */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Proof of Identity & Trade Certificate</h2>
        <p className="text-xs text-gray-500">
          Upload your NIN slip, Voter's Card, Driver's License, or Trade Certificate (PDF or Image under 5MB).
        </p>

        <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-8 text-center transition bg-gray-50/50">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">
            {uploading ? 'Uploading document...' : 'Click to select and upload document'}
          </p>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleDocUpload}
            disabled={uploading}
            className="mt-3 text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {profile?.has_id_document && (
          <p className="text-xs font-bold text-emerald-600 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" /> Identification document is on file and pending verification.
          </p>
        )}
      </div>
    </div>
  );
};
