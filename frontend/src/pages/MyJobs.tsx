import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../api/endpoints';
import type { Job, JobStatus } from '../types';
import { Briefcase, ArrowRight } from 'lucide-react';

export const MyJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    jobsApi
      .getAll()
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'pending':
      case 'requested':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredJobs = statusFilter
    ? jobs.filter((j) => j.status === statusFilter)
    : jobs;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Job Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track requested service assignments, live chat updates, and settlements.</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Job Statuses</option>
          <option value="requested">Requested / Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="paid">Paid & Settled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="text-gray-600 font-medium">No service jobs found.</p>
          <Link to="/pros" className="inline-block text-blue-600 font-bold text-sm hover:underline">
            Explore Pros to request work
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const amount = job.budget_amount || job.agreed_price || 0;
            return (
              <div
                key={job.id}
                className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(
                        job.status
                      )}`}
                    >
                      {job.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">Job #{job.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{job.description}</p>
                </div>

                <div className="flex items-center justify-between md:justify-end space-x-6 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-medium">Job Budget</span>
                    <span className="text-base font-extrabold text-gray-900">
                      ₦{amount.toLocaleString()}
                    </span>
                  </div>

                  <Link
                    to={`/jobs/${job.id}`}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
