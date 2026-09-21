import api from './client';
import type { User, SkillCategory, ProProfile, Job, Message, Review, Payment } from '../types';

export const authApi = {
  login: async (credentials: any) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: any) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (data: { current_password: string; new_password: string }) => {
    const res = await api.post('/auth/change-password', data);
    return res.data;
  },
};

export const categoriesApi = {
  getAll: async (): Promise<SkillCategory[]> => {
    const res = await api.get('/categories');
    return res.data;
  },
};

export const prosApi = {
  search: async (params: {
    category_id?: number;
    lat?: number;
    lng?: number;
    radius_km?: number;
  }): Promise<ProProfile[]> => {
    const res = await api.get('/pros/search', { params });
    return res.data;
  },
  getById: async (id: number): Promise<ProProfile> => {
    const res = await api.get(`/pros/${id}`);
    return res.data;
  },
  getMyProfile: async (): Promise<ProProfile> => {
    const res = await api.get('/pros/me');
    return res.data;
  },
  createProfile: async (data: any): Promise<ProProfile> => {
    const res = await api.post('/pros/profile', data);
    return res.data;
  },
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('id_document', file);
    const res = await api.post('/pros/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const jobsApi = {
  create: async (data: any): Promise<Job> => {
    const res = await api.post('/jobs', data);
    return res.data;
  },
  getAll: async (): Promise<Job[]> => {
    const res = await api.get('/jobs/mine');
    return res.data;
  },
  getById: async (id: number): Promise<Job> => {
    const res = await api.get(`/jobs/${id}`);
    return res.data;
  },
  acceptJob: async (id: number): Promise<Job> => {
    const res = await api.post(`/jobs/${id}/accept`);
    return res.data;
  },
  declineJob: async (id: number): Promise<Job> => {
    const res = await api.post(`/jobs/${id}/decline`);
    return res.data;
  },
  startJob: async (id: number): Promise<Job> => {
    const res = await api.post(`/jobs/${id}/start`);
    return res.data;
  },
  completeJob: async (id: number): Promise<Job> => {
    const res = await api.post(`/jobs/${id}/complete`);
    return res.data;
  },
  setEnRoute: async (id: number): Promise<Job> => {
    const res = await api.post(`/jobs/${id}/en-route`);
    return res.data;
  },
  updateLocation: async (id: number, coords: { latitude: number; longitude: number }) => {
    const res = await api.post(`/jobs/${id}/location`, coords);
    return res.data;
  },
  getPings: async (id: number) => {
    const res = await api.get(`/jobs/${id}/pings`);
    return res.data;
  },
  getMessages: async (jobId: number): Promise<Message[]> => {
    const res = await api.get(`/chat/${jobId}/messages`);
    return res.data;
  },
  sendMessage: async (jobId: number, content: string): Promise<Message> => {

    const res = await api.post(`/chat/${jobId}/messages`, { content });
    return res.data;
  },
};

export const paymentsApi = {
  initialize: async (jobId: number) => {
    const res = await api.post('/payments/initialize', { job_id: jobId });
    return res.data;
  },
  verify: async (reference: string) => {
    const res = await api.get(`/payments/verify/${reference}`);
    return res.data;
  },
};

export const reviewsApi = {
  create: async (data: { job_id: number; rating: number; comment?: string }): Promise<Review> => {
    const res = await api.post('/reviews', data);
    return res.data;
  },
};

export const adminApi = {
  bootstrap: async (data: any) => {
    const res = await api.post('/admin/bootstrap', data);
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getPendingPros: async (): Promise<ProProfile[]> => {
    const res = await api.get('/admin/pros/pending');
    return res.data;
  },
  verifyPro: async (proId: number, decision: 'approve' | 'reject', notes?: string) => {
    const res = await api.post(`/admin/pros/${proId}/${decision}`, { notes });
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  toggleUserStatus: async (userId: number): Promise<User> => {
    const res = await api.post(`/admin/users/${userId}/toggle-status`);
    return res.data;
  },
  promoteToAdmin: async (userId: number): Promise<User> => {
    const res = await api.post(`/admin/users/${userId}/promote-admin`);
    return res.data;
  },
  revokeAdmin: async (userId: number): Promise<User> => {
    const res = await api.post(`/admin/users/${userId}/revoke-admin`);
    return res.data;
  },
  getTransactions: async (): Promise<Payment[]> => {
    const res = await api.get('/admin/transactions');
    return res.data;
  },
  getAllJobs: async (): Promise<Job[]> => {
    const res = await api.get('/admin/jobs');
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  },
};

