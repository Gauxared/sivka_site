import { env } from './env';
import type {
  ApiResponse,
  AvailabilityCheckResult,
  Booking,
  BookingRequest,
  BookingRule,
  ContactInfo,
  GalleryItem,
  Horse,
  HorseWorkloadSummary,
  ManagerAttentionBooking,
  ManagerBookingFilters,
  ManagerDashboardStats,
  Review,
  RulesInfo,
  Service,
  SiteContent,
  StaffAccount,
  TimeSlot,
  Trainer,
  TrainerWorkloadSummary,
} from '../types';

interface ApiErrorPayload {
  code?: string;
  message?: string;
}

const BACKEND_SESSION_TOKEN_KEY = 'sivka_backend_session_token';

export interface AuthUser {
  id: string;
  role: 'admin' | 'manager' | 'trainer';
  name: string;
  trainerId?: string;
  sessionToken?: string;
}

export interface AdminSnapshot {
  siteContent: SiteContent;
  services: Service[];
  galleryItems: GalleryItem[];
  horses: Horse[];
  trainers: Trainer[];
  staffAccounts: StaffAccount[];
  bookings: Booking[];
  bookingRules: BookingRule[];
  reviews: Review[];
  contacts: ContactInfo;
  rulesInfo: RulesInfo;
}

async function sendRequest(path: string, init: RequestInit | undefined, sessionToken?: string) {
  const { headers, ...requestInit } = init || {};
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestInit,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(headers || {}),
    },
  });

  const raw = await response.text();
  const parsed = raw ? JSON.parse(raw) : {};
  return { response, parsed };
}

function getStoredBackendSessionToken() {
  return window.sessionStorage.getItem(BACKEND_SESSION_TOKEN_KEY);
}

function clearStoredBackendSessionToken() {
  window.sessionStorage.removeItem(BACKEND_SESSION_TOKEN_KEY);
}

export async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const sessionToken = path === '/auth/login' ? null : getStoredBackendSessionToken();
  let result = await sendRequest(path, init, sessionToken || undefined);

  if (!result.response.ok && result.response.status === 401 && sessionToken) {
    clearStoredBackendSessionToken();
    result = await sendRequest(path, init);
  }

  const { response, parsed } = result;

  if (!response.ok) {
    const error = parsed as ApiErrorPayload;
    const message =
      response.status === 401
        ? 'Сессия администратора истекла. Войдите заново.'
        : response.status === 403
          ? 'Недостаточно прав для этого действия.'
          : error.message || `HTTP ${response.status}`;
    const err = new Error(message) as Error & { isAuthError?: boolean };
    if (response.status === 401) {
      clearStoredBackendSessionToken();
      err.isAuthError = true;
    }
    throw err;
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    return parsed as ApiResponse<T>;
  }

  return { data: parsed as T };
}

export const loginStaff = async (data: { role: AuthUser['role']; login?: string; password: string; trainerId?: string }) => {
  const response = await request<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  if (response.data.sessionToken) {
    window.sessionStorage.setItem(BACKEND_SESSION_TOKEN_KEY, response.data.sessionToken);
  }
  return response;
};

export const logoutStaff = async () => {
  try {
    return await request<{ ok: boolean }>('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  } finally {
    window.sessionStorage.removeItem(BACKEND_SESSION_TOKEN_KEY);
  }
};
export const getCurrentStaffUser = () => request<AuthUser | null>('/auth/me');

export const getAdminSnapshot = () => request<AdminSnapshot>('/admin/snapshot');
export const saveAdminSnapshot = (data: AdminSnapshot) =>
  request<AdminSnapshot>('/admin/snapshot', { method: 'PATCH', body: JSON.stringify(data) });
export const resetBackendData = () => request<unknown>('/dev/reset', { method: 'POST', body: JSON.stringify({}) });

export const getServices = () => request<Service[]>('/services');
export const getServiceById = (id: string) => request<Service | undefined>(`/services/${id}`);
export const updateService = (id: string, data: Partial<Service>) =>
  request<Service | undefined>(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const getSiteContent = () => request<SiteContent>('/site-content');
export const updateSiteContent = (data: Partial<SiteContent>) =>
  request<SiteContent>('/site-content', { method: 'PATCH', body: JSON.stringify(data) });
export const createBookingRequest = (data: BookingRequest) =>
  request<{ requestId: string }>('/bookings', { method: 'POST', body: JSON.stringify(data) });

export const getHorses = () => request<Horse[]>('/horses');
export const getTrainers = () => request<Trainer[]>('/trainers');
export const createTrainer = (data: Trainer) => request<Trainer>('/trainers', { method: 'POST', body: JSON.stringify(data) });
export const updateTrainer = (id: string, data: Partial<Trainer>) =>
  request<Trainer | undefined>(`/trainers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteTrainer = (id: string) => request<{ id: string }>(`/trainers/${id}`, { method: 'DELETE' });
export const createHorse = (data: Horse) => request<Horse>('/horses', { method: 'POST', body: JSON.stringify(data) });
export const updateHorse = (id: string, data: Partial<Horse>) =>
  request<Horse | undefined>(`/horses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteHorse = (id: string) => request<{ id: string }>(`/horses/${id}`, { method: 'DELETE' });

export const getBookings = () => request<Booking[]>('/bookings');
export const getBookingById = (id: string) => request<Booking | undefined>(`/bookings/${id}`);
export const updateBookingStatus = (id: string, status: Booking['status'], adminComment?: string) =>
  request<Booking | undefined>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, adminComment }) });
export const assignBookingHorses = (id: string, assignedHorses: Booking['assignedHorses']) =>
  request<Booking | undefined>(`/bookings/${id}/assign-horses`, { method: 'PATCH', body: JSON.stringify({ assignedHorses }) });
export const assignBookingTrainer = (id: string, trainerId?: string) =>
  request<Booking | undefined>(`/bookings/${id}/assign-trainer`, { method: 'PATCH', body: JSON.stringify({ trainerId }) });
export const updateBookingTrainerStatus = (id: string, trainerStatus?: Booking['trainerStatus']) =>
  request<Booking | undefined>(`/bookings/${id}/trainer-status`, { method: 'PATCH', body: JSON.stringify({ trainerStatus }) });

export const getAvailability = (serviceId: string, date: string) =>
  request<TimeSlot[]>(`/availability/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`);
export const checkAvailability = (data: BookingRequest) =>
  request<AvailabilityCheckResult>('/availability/check', { method: 'POST', body: JSON.stringify(data) });
export const getAvailableBookingDates = (serviceId: string) =>
  request<Array<{ date: string; isAvailable: boolean; reason?: string }>>(`/availability/dates?serviceId=${encodeURIComponent(serviceId)}&days=120`);

export const getBookingRules = () => request<BookingRule[]>('/booking-rules');
export const createBookingRule = (data: BookingRule) =>
  request<BookingRule>('/booking-rules', { method: 'POST', body: JSON.stringify(data) });
export const updateBookingRule = (id: string, data: Partial<BookingRule>) =>
  request<BookingRule | undefined>(`/booking-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteBookingRule = (id: string) => request<{ id: string }>(`/booking-rules/${id}`, { method: 'DELETE' });
export const getScheduleExceptions = () => request<BookingRule[]>('/schedule/exceptions');

export const getReviews = () => request<Review[]>('/reviews');
export const getGalleryItems = () => request<GalleryItem[]>('/gallery');
export const createGalleryItem = (data: GalleryItem) => request<GalleryItem>('/gallery/items', { method: 'POST', body: JSON.stringify(data) });
export const updateGalleryItem = (id: string, data: Partial<GalleryItem>) =>
  request<GalleryItem | undefined>(`/gallery/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteGalleryItem = (id: string) => request<{ id: string }>(`/gallery/items/${id}`, { method: 'DELETE' });
export const getContacts = () => request<ContactInfo>('/contacts');
export const getRules = () => request<RulesInfo>('/rules-info');
export const saveContacts = (data: ContactInfo) => request<ContactInfo>('/contacts', { method: 'PATCH', body: JSON.stringify(data) });
export const saveReviews = (data: Review[]) => request<Review[]>('/reviews', { method: 'PATCH', body: JSON.stringify(data) });
export const saveRules = (data: RulesInfo) => request<RulesInfo>('/rules-info', { method: 'PATCH', body: JSON.stringify(data) });

const managerQuery = (filters?: ManagerBookingFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const getManagerBookings = (filters?: ManagerBookingFilters) =>
  request<Booking[]>(`/manager/bookings${managerQuery(filters)}`);
export const getManagerBookingById = (id: string) => request<Booking | undefined>(`/manager/bookings/${id}`);
export const getManagerDashboardStats = () => request<ManagerDashboardStats>('/manager/dashboard/stats');
export const getManagerAttentionBookings = () => request<ManagerAttentionBooking[]>('/manager/attention-bookings');
export const getManagerTrainerWorkload = (dateFrom?: string, dateTo?: string) =>
  request<TrainerWorkloadSummary[]>(`/manager/workload/trainers${managerQuery({ dateFrom, dateTo })}`);
export const getManagerHorseWorkload = (dateFrom?: string, dateTo?: string) =>
  request<HorseWorkloadSummary[]>(`/manager/workload/horses${managerQuery({ dateFrom, dateTo })}`);
export const getManagerReferenceData = () =>
  request<{ services: Service[]; trainers: Trainer[]; horses: Horse[] }>('/manager/reference-data');
export const getManagerTodaySchedule = () => request<Booking[]>('/manager/today-schedule');
