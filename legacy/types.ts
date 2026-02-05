
export enum UserRole {
  MASTER = 'master',
  OWNER = 'owner',
  BARBER = 'barber'
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

export enum OrderStatus {
  OPEN = 'open',
  AWAITING_PAYMENT = 'awaiting_payment',
  COMPLETED = 'completed',
  ABSENT = 'absent'
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  active: boolean;
  trial_ends_at: string;
  created_at: string;
  owner_email: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  cpf: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string;
  service_commission: number;
  product_commission: number;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  image_url: string;
  current_stock: number;
  min_stock: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  barber_id: string;
  service_id: string;
  customer_name: string;
  customer_whatsapp: string;
  scheduled_at: string;
  status: OrderStatus;
  service_name?: string;
  price?: number;
}
