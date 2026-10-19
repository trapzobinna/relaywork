import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { prosApi, categoriesApi, portfolioApi } from '../api/endpoints';
import type { SkillCategory, ProProfile } from '../types';
import { useToast } from '../context/ToastContext';
import { MapPicker } from '../components/MapPicker';
import { Upload, CheckCircle, AlertCircle, Clock, ShieldCheck, MapPin, Trash2, Camera, ArrowRight, LayoutDashboard } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
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
            .then(photos => setPortfolioPhotos(photos))
            .catch(err => console.error('Failed to load portfolio:', err));
        }
      })
      .catch(() => {
        // Normal for a pro who hasn't completed onboarding yet
      })
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

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && profile?.id) {
      try {
        setUploadingPortfolio(true);
        const newPhoto = await portfolioApi.upload(profile.id, e.target.files[0], portfolioCaption);
        setPortfolioPhotos([newPhoto, ...portfolioPhotos]);
        setPortfolioCaption('');
        showToast('Portfolio photo added!', 'success');
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
            Complete your trade information, base location pin, payout bank, and upload ID to receive your Vetted Badge.
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
                  ? 'Your pro badge is active! You appear in top search results.'
                  : 'Your profile and verification documents are under review by our governance team.'}
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Proof of Identity & Trade Certificate</h2>
        <p className="text-xs text-gray-500">
          Upload your NIN slip, Voter's Card, Driver's License, or Trade Certificate (PDF or Image under 5MB).
        </p>

        {!profile ? (
          <div className="border-2 border-dashed border-red-200 rounded-2xl p-8 text-center bg-red-50 text-red-600 font-medium">
            Please click "Save Profile & Settings" above to create your profile before uploading documents.
          </div>
        ) : (
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
        )}

        {profile?.has_id_document && (
          <p className="text-xs font-bold text-emerald-600 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" /> Identification document is on file and pending verification.
          </p>
        )}
      </div>

      {/* Portfolio Photos Upload (Only enabled if profile exists) */}
      {profile && (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Past Work & Portfolio</h2>
          <p className="text-xs text-gray-500">
            Upload up to 10 photos of your best previous jobs to build trust with clients.
          </p>
          
          <div className="flex gap-3 mt-4">
            <input 
              type="text" 
              placeholder="Optional caption (e.g. Fixing AC in Lekki)" 
              value={portfolioCaption}
              onChange={(e) => setPortfolioCaption(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handlePortfolioUpload}
                disabled={uploadingPortfolio || portfolioPhotos.length >= 10}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <button disabled={uploadingPortfolio || portfolioPhotos.length >= 10} className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-4 py-2 rounded-xl border border-blue-200 flex items-center transition disabled:opacity-50">
                <Camera className="w-4 h-4 mr-2" />
                {uploadingPortfolio ? 'Uploading...' : 'Add Photo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {portfolioPhotos.map((photo) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square">
                <img src={photo.image_url} alt={photo.caption || 'Portfolio'} className="w-full h-full object-cover" />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5 text-white text-[10px] leading-tight">
                    {photo.caption}
                  </div>
                )}
                <button
                  onClick={() => handleDeletePortfolio(photo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition"
                  title="Delete Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          {portfolioPhotos.length === 0 && (
             <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
               No photos yet. Add some to show off your skills!
             </div>
          )}
        </div>
      )}
    </div>
  );
};
