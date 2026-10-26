import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { prosApi, categoriesApi, portfolioApi } from '../api/endpoints';
import type { SkillCategory, ProProfile } from '../types';
import { useToast } from '../context/ToastContext';
import { MapPicker } from '../components/MapPicker';
import {
  Upload, CheckCircle, AlertCircle, Clock, ShieldCheck,
  MapPin, Trash2, Camera, ArrowRight, LayoutDashboard, FileText
} from 'lucide-react';

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

export const ProOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>(DEFAULT_CATEGORIES);
  const [portfolioPhotos, setPortfolioPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [portfolioCaption, setPortfolioCaption] = useState('');
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
    // 1. Fetch categories
    categoriesApi.getAll()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch((err) => console.error('Failed to fetch categories:', err));

    // 2. Fetch pro profile if it exists
    prosApi.getMyProfile()
      .then((myProf) => {
        if (myProf) {
          setProfile(myProf);
          if (myProf.skill_category_id) {
            setCategoryId(myProf.skill_category_id);
          }
          setBio(myProf.bio || '');
          setServiceRadius(myProf.service_radius_km || 25);
          setAddressText(myProf.address_text || 'Ikeja, Lagos');
          setLat(myProf.latitude || 6.6018);
          setLng(myProf.longitude || 3.3515);
          setBankName(myProf.bank_name || 'GTBank');
          setAccountNumber(myProf.account_number || '');
          setAccountName(myProf.account_name || '');
          
          portfolioApi.getByPro(myProf.id)
            .then(photos => setPortfolioPhotos(photos || []))
            .catch(err => console.error('Failed to load portfolio:', err));
        }
      })
      .catch(() => {
        // Normal for a pro who hasn't completed onboarding yet
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const updated = await prosApi.createProfile({
        skill_category_id: Number(categoryId),
        bio: bio || 'Professional verified artisan providing skilled trade services.',
        service_radius_km: Number(serviceRadius) || 25,
        latitude: Number(lat) || 6.5244,
        longitude: Number(lng) || 3.3792,
        address_text: addressText || 'Lagos, Nigeria',
        bank_name: bankName || 'Access Bank',
        bank_code: bankCode || '044',
        account_number: accountNumber || undefined,
        account_name: accountName || undefined,
      });
      setProfile(updated);
      showToast('Profile information saved successfully!', 'success');
      return updated;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile';
      showToast(msg, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploadingId(true);
        // Ensure profile exists first if user hasn't hit save
        if (!profile) {
          await handleSubmit();
        }
        const res = await prosApi.uploadDocument(e.target.files[0], 'id');
        showToast('Identification document uploaded successfully!', 'success');
        if (res.profile) {
          setProfile(res.profile);
        } else {
          const refreshed = await prosApi.getMyProfile();
          setProfile(refreshed);
        }
      } catch (err: any) {
        showToast(err.response?.data?.detail || 'Failed to upload ID document', 'error');
      } finally {
        setUploadingId(false);
      }
    }
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploadingCert(true);
        if (!profile) {
          await handleSubmit();
        }
        const res = await prosApi.uploadDocument(e.target.files[0], 'cert');
        showToast('Trade certificate uploaded successfully!', 'success');
        if (res.profile) {
          setProfile(res.profile);
        } else {
          const refreshed = await prosApi.getMyProfile();
          setProfile(refreshed);
        }
      } catch (err: any) {
        showToast(err.response?.data?.detail || 'Failed to upload certificate', 'error');
      } finally {
        setUploadingCert(false);
      }
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setUploadingPortfolio(true);
        let proId = profile?.id;
        if (!proId) {
          const prof = await handleSubmit();
          proId = prof?.id;
        }
        if (proId) {
          const newPhoto = await portfolioApi.upload(proId, e.target.files[0], portfolioCaption);
          setPortfolioPhotos([newPhoto, ...portfolioPhotos]);
          setPortfolioCaption('');
          showToast('Portfolio photo added!', 'success');
        }
      } catch (err: any) {
        showToast(err.response?.data?.detail || 'Failed to upload portfolio photo', 'error');
      } finally {
        setUploadingPortfolio(false);
      }
    }
  };

  const handleDeletePortfolio = async (photoId: number) => {
    if (!profile?.id || !window.confirm('Are you sure you want to delete this photo?')) return;
    try {
      await portfolioApi.delete(profile.id, photoId);
      setPortfolioPhotos(portfolioPhotos.filter(p => p.id !== photoId));
      showToast('Photo deleted', 'success');
    } catch (err: any) {
      showToast('Failed to delete photo', 'error');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pro Profile & Identity Verification</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure your trade category, base operating location, payout bank, and upload ID to unlock bookings.
          </p>
        </div>
        {profile && (
          <Link
            to="/pro-dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition whitespace-nowrap"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Pro Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Verification Status Banner */}
      {profile && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
            profile.verification_status === 'approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : profile.verification_status === 'pending'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-3.5">
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
                  ? 'Your pro badge is active! You appear at the top of client search and job dispatches.'
                  : 'Your profile and verification documents are active and submitted to our verification team.'}
              </p>
            </div>
          </div>
          <Link
            to="/pro-dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50 transition"
          >
            <span>View Jobs & Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          <p className="text-xs text-gray-500">Click on the map below to set your exact base operating location for accurate travel fee estimation.</p>
          <MapPicker initialLat={lat} initialLng={lng} onLocationSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
        </div>

        {/* Bank Subaccount Information */}
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3 pt-4">Payout Bank Information (Escrow Transfers)</h2>
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

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {profile ? (
            <Link
              to="/pro-dashboard"
              className="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1.5 transition py-2"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>Go to My Dashboard</span>
            </Link>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-2xl transition shadow-md shadow-blue-600/20 text-sm"
            >
              {saving ? 'Saving Profile...' : 'Save Profile & Settings'}
            </button>
            {profile && (
              <button
                type="button"
                onClick={() => navigate('/pro-dashboard')}
                className="bg-gray-900 hover:bg-black text-white font-bold px-6 py-3 rounded-2xl transition shadow-sm text-sm flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Proof of Identity Document Upload */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Proof of Identity & Verification Documents</h2>
        <p className="text-xs text-gray-500">
          Upload your Government-issued ID (NIN Slip, Voter's Card, or Driver's License) and Trade Certificate to receive the Verified Artisan Trust Badge.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Government ID Card */}
          <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-gray-50/50 flex flex-col justify-between items-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">National ID / Voter's Card / Driver's License</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or PDF under 5MB</p>
            </div>
            {profile?.has_id_document ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4" /> Document on File (Uploaded)
              </div>
            ) : null}
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm transition">
                <Upload className="w-3.5 h-3.5" />
                {uploadingId ? 'Uploading...' : profile?.has_id_document ? 'Replace ID Document' : 'Upload ID Document'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleIdUpload}
                disabled={uploadingId}
                className="hidden"
              />
            </label>
          </div>

          {/* Trade / Apprenticeship Certificate */}
          <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-gray-50/50 flex flex-col justify-between items-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Trade / Apprenticeship Certificate</p>
              <p className="text-xs text-gray-400 mt-1">NABTEB, Trade Union, or Workshop Certificate</p>
            </div>
            {profile?.has_cert_document ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4" /> Certificate on File (Uploaded)
              </div>
            ) : null}
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2.5 rounded-xl shadow-sm transition">
                <Upload className="w-3.5 h-3.5" />
                {uploadingCert ? 'Uploading...' : profile?.has_cert_document ? 'Replace Certificate' : 'Upload Certificate'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleCertUpload}
                disabled={uploadingCert}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Portfolio / Past Work Photos */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Portfolio & Past Completed Jobs</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              High quality photos of your real previous jobs build client trust and boost booking rates.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {portfolioPhotos.length}/10 photos
          </span>
        </div>

        {/* Upload New Photo */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={portfolioCaption}
            onChange={(e) => setPortfolioCaption(e.target.value)}
            placeholder="Add a caption (e.g. '3.5kVA Inverter Installation in Lekki Phase 1')"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold px-6 py-2.5 rounded-xl text-sm transition whitespace-nowrap shadow-sm">
            <Camera className="w-4 h-4" />
            <span>{uploadingPortfolio ? 'Uploading...' : 'Add Work Photo'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePortfolioUpload}
              disabled={uploadingPortfolio}
              className="hidden"
            />
          </label>
        </div>

        {/* Photos Grid */}
        {portfolioPhotos.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-500">No portfolio photos uploaded yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Showcase your before & after installations to win more clients</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {portfolioPhotos.map((photo) => (
              <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-square">
                <img
                  src={photo.image_url}
                  alt={photo.caption || 'Past work'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                  <p className="text-[11px] font-medium line-clamp-3">
                    {photo.caption || 'Portfolio photo'}
                  </p>
                  <button
                    onClick={() => handleDeletePortfolio(photo.id)}
                    className="self-end p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
