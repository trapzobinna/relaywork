import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { prosApi, jobsApi, portfolioApi } from '../api/endpoints';
import type { ProProfile, Job } from '../types';
import { Briefcase, Wallet, Star, CheckCircle, MapPin, Camera, Trash2, Power, Activity } from 'lucide-react';

export const ProDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for actions
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [portfolioCaption, setPortfolioCaption] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'pro') {
      navigate('/');
      return;
    }

    Promise.all([
      prosApi.getMyProfile().catch(() => null),
      jobsApi.getAll().catch(() => [])
    ]).then(([prof, jbs]) => {
      if (!prof) {
        showToast('Please complete your profile onboarding first', 'error');
        navigate('/pro/onboarding');
        return;
      }
      setProfile(prof);
      setJobs(jbs);
      
      // Load portfolio photos
      portfolioApi.getByPro(prof.id)
        .then(photos => setPortfolioPhotos(photos))
        .catch(err => console.error('Failed to load portfolio:', err));
        
      setLoading(false);
    });
  }, [user, navigate]);

  const toggleAvailability = async () => {
    if (!profile) return;
    try {
      setUpdatingAvailability(true);
      const updated = await prosApi.updateAvailability(!profile.is_available);
      setProfile(updated);
      showToast(updated.is_available ? 'You are now Online and visible to clients.' : 'You are now Offline.', 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setUpdatingAvailability(false);
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
    if (!profile?.id || !window.confirm('Delete this portfolio photo?')) return;
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const requestedJobs = jobs.filter(j => j.status === 'requested');
  const activeJobs = jobs.filter(j => ['accepted', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => ['completed', 'paid'].includes(j.status));
  const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.pro_payout || 0), 0);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* ── Premium Hero Header ── */}
      <div className="bg-gray-900 text-white pt-12 pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Welcome back, {user?.full_name?.split(' ')[0]}</h1>
            <p className="text-gray-400 font-medium text-lg">Manage your business and portfolio.</p>
          </div>
          
          {/* Availability Toggle */}
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-4">
            <div className="flex flex-col">
              <span className={`font-bold text-lg ${profile?.is_available ? 'text-emerald-400' : 'text-gray-300'}`}>
                {profile?.is_available ? 'You are Online' : 'You are Offline'}
              </span>
              <span className="text-xs text-gray-400">
                {profile?.is_available ? 'Receiving new job requests' : 'Hidden from client searches'}
              </span>
            </div>
            <button 
              onClick={toggleAvailability}
              disabled={updatingAvailability}
              className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all shadow-lg ${profile?.is_available ? 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              <Power className={`w-6 h-6 ${profile?.is_available ? 'text-white' : 'text-gray-300'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-12 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Earnings', value: `₦${totalEarnings.toLocaleString()}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Active Jobs', value: activeJobs.length, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'New Requests', value: requestedJobs.length, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Avg Rating', value: profile?.avg_rating?.toFixed(1) || '0.0', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* ── Left Column: Jobs ── */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-black text-gray-900">Current Work</h2>
            
            {/* New Requests */}
            {requestedJobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Requests</h3>
                {requestedJobs.map(job => (
                  <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="bg-white p-5 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition flex justify-between items-center group">
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-amber-600 transition">{job.title}</h4>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1" /> {job.location_address || 'Client Location'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase">Budget</p>
                      <p className="font-black text-lg text-gray-900">₦{job.budget_amount?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active Jobs */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">In Progress</h3>
              {activeJobs.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                  <p className="text-gray-400 font-medium">No active jobs right now.</p>
                </div>
              ) : (
                activeJobs.map(job => (
                  <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="bg-white p-5 rounded-2xl border-l-4 border-l-blue-600 border-y border-r border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition flex justify-between items-center group">
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{job.title}</h4>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1" /> {job.location_address || 'Client Location'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600 font-bold uppercase">Status</p>
                      <p className="font-black text-sm text-gray-900 capitalize">{job.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Right Column: Portfolio Manager ── */}
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-xl font-black text-gray-900">Portfolio</h2>
              <span className="text-xs font-bold text-gray-400">{portfolioPhotos.length}/10 Photos</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="relative overflow-hidden rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-400 transition p-4 text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePortfolioUpload}
                  disabled={uploadingPortfolio || portfolioPhotos.length >= 10}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-600">{uploadingPortfolio ? 'Uploading...' : 'Tap to add photo'}</p>
                <p className="text-xs text-gray-400 mt-1">Showcase your best work</p>
              </div>

              {portfolioPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {portfolioPhotos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square border border-gray-200">
                      <img src={photo.image_url} alt="Portfolio" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePortfolio(photo.id); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
