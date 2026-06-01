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
  Review,
  RulesInfo,
  Service,
  SiteContent,
  TimeSlot,
  Trainer,
} from '../types';

interface ApiErrorPayload {
  code?: string;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const raw = await response.text();
  const parsed = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    const error = parsed as ApiErrorPayload;
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    return parsed as ApiResponse<T>;
  }

  return { data: parsed as T };
}

export const getServices = () => request<Service[]>('/services');
export const getServiceById = (id: string) => request<Service | undefined>(`/services/${id}`);
export const getSiteContent = () => request<SiteContent>('/site-content');
export const createBookingRequest = (data: BookingRequest) =>
  request<{ requestId: string }>('/bookings', { method: 'POST', body: JSON.stringify(data) });

export const getHorses = () => request<Horse[]>('/horses');
export const getTrainers = () => request<Trainer[]>('/trainers');
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
  request<Array<{ date: string; isAvailable: boolean; reason?: string }>>(`/availability/dates?serviceId=${encodeURIComponent(serviceId)}`);

export const getBookingRules = () => request<BookingRule[]>('/booking-rules');
export const createBookingRule = (data: BookingRule) =>
  request<BookingRule>('/booking-rules', { method: 'POST', body: JSON.stringify(data) });
export const updateBookingRule = (id: string, data: Partial<BookingRule>) =>
  request<BookingRule | undefined>(`/booking-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteBookingRule = (id: string) => request<{ id: string }>(`/booking-rules/${id}`, { method: 'DELETE' });
export const getScheduleExceptions = () => request<BookingRule[]>('/schedule/exceptions');

export const getReviews = () => request<Review[]>('/reviews');
export const getGalleryItems = () => request<GalleryItem[]>('/gallery');
export const getContacts = () => request<ContactInfo>('/contacts');
export const getRules = () => request<RulesInfo>('/rules-info');
export const saveContacts = (data: ContactInfo) => request<ContactInfo>('/contacts', { method: 'PATCH', body: JSON.stringify(data) });
export const saveReviews = (data: Review[]) => request<Review[]>('/reviews', { method: 'PATCH', body: JSON.stringify(data) });
export const saveRules = (data: RulesInfo) => request<RulesInfo>('/rules-info', { method: 'PATCH', body: JSON.stringify(data) });
