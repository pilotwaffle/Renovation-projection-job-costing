export interface Job {
  id: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  status: 'draft' | 'active' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  end_date?: string;
  budget?: number;
  actual_cost?: number;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  job_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration?: number; // in minutes
  description?: string;
  hourly_rate?: number;
  total_cost?: number;
  latitude?: number;
  longitude?: number;
  location_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostItem {
  id: string;
  job_id: string;
  type: 'material' | 'labor' | 'equipment' | 'subcontractor' | 'other';
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  vendor?: string;
  invoice_number?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'technician';
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  job_updates: boolean;
  time_reminders: boolean;
  budget_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  job_id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  taken_at: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Document {
  id: string;
  job_id: string;
  name: string;
  url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  created_at: string;
}

export interface Note {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  job_id: string;
  user_id: string;
  action: string;
  entity_type: 'job' | 'client' | 'time_entry' | 'cost_item' | 'note' | 'photo' | 'document';
  entity_id: string;
  details?: any;
  created_at: string;
}