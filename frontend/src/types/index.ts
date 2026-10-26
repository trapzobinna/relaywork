export type Role = 'client' | 'pro' | 'admin';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type JobStatus =
  | 'requested'
  | 'pending'
  | 'matched'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'en_route'
  | 'on_site'
  | 'quick_fix_done'
  | 'quote_sent'
  | 'quote_funded'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'released'
  | 'paid'
  | 'cancelled'
  | 'disputed';

export type MaterialsMode = 'mode_a_client' | 'mode_b_wallet';

export type MilestoneStatus = 'pending' | 'funded' | 'in_progress' | 'completed' | 'released';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'voided';

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

export interface PortfolioPhoto {
  id: number;
  pro_profile_id: number;
  image_url: string;
  caption?: string;
  uploaded_at: string;
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
  account_name?: string;
  masked_account_number?: string;
  avg_rating?: number;
  rating_avg?: number;
  rating_count?: number;
  total_reviews?: number;
  total_jobs_completed?: number;
  is_available?: boolean;
  distance_km?: number;
  portfolio_photos?: PortfolioPhoto[];
  created_at?: string;
}

export interface PricingEstimate {
  min_kobo: number;
  max_kobo: number;
  min_naira: number;
  max_naira: number;
  display_range: string;
  exact_call_out_kobo?: number;
  exact_call_out_naira?: number;
  straight_distance_km?: number;
  estimated_road_km?: number;
  estimated_minutes?: number;
  surge_multiplier: number;
  surge_reason?: string;
  diagnostic_credit_percent: number;
  pricing_version: string;
}

export interface CatalogItem {
  id: number;
  skill_category_id: number;
  trade: string;
  name: string;
  labor_kobo: number;
  labor_naira: number;
  parts_allowance_kobo: number;
  parts_allowance_naira: number;
  included_parts?: string;
  is_active: boolean;
}

export interface MaterialLine {
  id: number;
  name: string;
  spec?: string;
  qty: number;
  unit_estimate_kobo: number;
  unit_estimate_naira: number;
  total_kobo: number;
  total_naira: number;
}

export interface Milestone {
  id: number;
  seq: number;
  name: string;
  amount_kobo: number;
  amount_naira: number;
  checklist?: string;
  status: MilestoneStatus;
  funded_at?: string;
  completed_at?: string;
}

export interface Quote {
  id: number;
  job_id: number;
  version: number;
  status: QuoteStatus;
  labor_total_kobo: number;
  labor_total_naira: number;
  materials_mode: MaterialsMode;
  materials_estimate_kobo: number;
  materials_estimate_naira: number;
  diagnostic_credit_kobo: number;
  diagnostic_credit_naira: number;
  net_payable_labor_kobo: number;
  net_payable_labor_naira: number;
  warranty_days: number;
  expires_at?: string;
  created_at: string;
  milestones: Milestone[];
  material_lines: MaterialLine[];
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
  job_type?: 'quoted' | 'quick_fix';
  call_out_kobo?: number;
  call_out_naira?: number;
  surge_multiplier?: number;
  surge_reason?: string;
  diagnosis_notes?: string;
  has_quote?: boolean;
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


export interface ActiveSessionUser {
  session_key: string;
  user_id: number | null;
  user_name: string;
  user_email: string;
  role: string;
  ip_address: string;
  city: string;
  region: string;
  country: string;
  device: string;
  browser: string;
  os: string;
  current_path: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  last_seen_at: string;
  last_seen_formatted: string;
  seconds_ago: number;
  hit_count: number;
}

export interface LiveTelemetryData {
  live_user_count: number;
  live_users: ActiveSessionUser[];
  all_time_visits: number;
  today_visits: number;
  unique_visitors: number;
  website_speed: {
    avg_response_time_ms: number;
    min_response_time_ms: number;
    max_response_time_ms: number;
    p95_response_time_ms: number;
    requests_per_minute: number;
    status: string;
  };
  database_speed: {
    db_latency_ms: number;
    status: string;
    engine: string;
    database_size_mb: number;
    is_healthy: boolean;
  };
  region_breakdown: Array<{ region: string; visits: number }>;
  user_type_breakdown: {
    pros: number;
    clients: number;
    admins: number;
    guests: number;
  };
  system_health: {
    uptime: string;
    server_status: string;
    active_threads: number;
  };
}
