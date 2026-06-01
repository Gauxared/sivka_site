import type { ApiResponse, Notification } from '../types';

const NOTIFICATIONS_KEY = 'orlov_notifications';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const delay = (ms = 300) => new Promise((resolve) => window.setTimeout(resolve, ms));

const respond = async <T>(data: T, ms?: number): Promise<ApiResponse<T>> => {
  await delay(ms);
  return { data };
};

function readStorage<T>(key: string, fallback: T): T {
  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return clone(fallback);

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    window.localStorage.removeItem(key);
    return clone(fallback);
  }
}

function writeStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('orlov-content-updated'));
}

function getStoredNotifications() {
  return readStorage<Notification[]>(NOTIFICATIONS_KEY, []);
}

function saveStoredNotifications(items: Notification[]) {
  writeStorage(NOTIFICATIONS_KEY, items);
}

export async function getNotifications(recipientId?: string): Promise<ApiResponse<Notification[]>> {
  const notifications = getStoredNotifications()
    .filter((item) => (recipientId ? item.recipientId === recipientId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return respond(notifications);
}

export async function getNotificationsByRecipient(
  recipientRole: Notification['recipientRole'],
  recipientId: string,
): Promise<ApiResponse<Notification[]>> {
  const notifications = getStoredNotifications()
    .filter((item) => item.recipientRole === recipientRole && item.recipientId === recipientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return respond(notifications);
}

export async function createNotification(
  data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
): Promise<ApiResponse<Notification>> {
  const notification: Notification = {
    ...data,
    id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  saveStoredNotifications([notification, ...getStoredNotifications()]);
  return respond(notification);
}

export async function markNotificationAsRead(id: string): Promise<ApiResponse<Notification | undefined>> {
  let updatedNotification: Notification | undefined;
  const nextItems = getStoredNotifications().map((notification) => {
    if (notification.id !== id) return notification;
    updatedNotification = { ...notification, isRead: true };
    return updatedNotification;
  });
  saveStoredNotifications(nextItems);
  return respond(updatedNotification);
}

export async function getUnreadNotificationsCount(recipientId?: string): Promise<ApiResponse<number>> {
  const count = getStoredNotifications().filter((item) => !item.isRead && (!recipientId || item.recipientId === recipientId)).length;
  return respond(count);
}
