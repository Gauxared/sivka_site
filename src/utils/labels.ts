import type { BookingStatus, RiderExperience, TrainerBookingStatus } from '../types';

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
  needs_clarification: 'Нужно уточнение',
  cancelled: 'Отменена',
};

export const trainerBookingStatusLabels: Record<TrainerBookingStatus, string> = {
  notified: 'Тренер уведомлен',
  seen: 'Тренер ознакомился',
  accepted: 'Тренер подтвердил',
  needs_clarification: 'Нужно уточнение',
  completed: 'Занятие проведено',
};

export const riderExperienceLabels: Record<RiderExperience, string> = {
  beginner: 'Новичок',
  experienced: 'Есть опыт',
  confident: 'Уверенный наездник',
};
