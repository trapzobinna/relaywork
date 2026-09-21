export type Role = 'client' | 'pro' | 'admin';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type JobStatus =
  | 'requested'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'cancelled'
  | 'disputed';

export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  phone_number?: string;
  role: Role;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface SkillCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface ProProfile {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user?: User;
  business_name?: string;
  bio?: string;
  skill_category_id?: number;
  skill_category_name?: string;
  category_id?: number;
  category?: SkillCategory;
  hourly_rate?: number;
  years_experience?: number;
  latitude: number;
  longitude: number;
  service_radius_km: number;
  address_text?: string;
  verification_status: VerificationStatus;
  verification_notes?: string;
  has_id_document?: boolean;
  has_cert_document?: boolean;
  id_document_url?: string;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  masked_account_number?: string;
  avg_rating?: number;
  rating_avg?: number;
  rating_count?: number;
  total_reviews?: number;
  total_jobs_completed?: number;
  is_available?: boolean;
  distance_km?: number;
  created_at?: string;
}

export interface JobPhoto {
  id: number;
  file_path: string;
  uploaded_at: string;
}

export interface Job {
  id: number;
  client_id: number;
  client_name?: string;
  client?: User;
  pro_id?: number;
  pro_name?: string;
  pro?: ProProfile;
  title: string;
  description: string;
  skill_category_id?: number;
  skill_category_name?: string;
  category_id?: number;
  category?: SkillCategory;
  budget_amount?: number;
  status: JobStatus;
  is_en_route?: boolean;
  has_arrived?: boolean;
  pro_current_lat?: number;
  pro_current_lng?: number;
  last_location_updated_at?: string;
  agreed_price?: number;
  platform_fee?: number;
  pro_payout?: number;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  address_text?: string;
  scheduled_for?: string;
  completed_at?: string;
  created_at: string;
  accepted_at?: string;
  paid_at?: string;
  photos?: JobPhoto[];
}

export interface JobLocationPing {
  id: number;
  job_id: number;
  latitude: number;
  longitude: number;
  recorded_at: string;
}


export interface Message {
  id: number;
  job_id: number;
  sender_id: number;
  sender_name?: string;
  sender?: User;
  content: string;
  sent_at?: string;
  created_at?: string;
}

export interface Review {
  id: number;
  job_id: number;
  reviewer_id?: number;
  reviewer_name?: string;
  client_id?: number;
  client?: User;
  pro_user_id?: number;
  pro_id?: number;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Payment {
  id: number;
  job_id: number;
  payer_id?: number;
  amount: number;
  platform_fee?: number;
  pro_amount?: number;
  currency?: string;
  reference: string;
  paystack_reference?: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}


