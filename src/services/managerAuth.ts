const MANAGER_SESSION_KEY = 'orlov_manager_session';
const MANAGER_LOGIN = 'manager';
const MANAGER_PASSWORD = 'manager123';

export function isManagerAuthorized() {
  return window.sessionStorage.getItem(MANAGER_SESSION_KEY) === 'true';
}

export function loginManager(login: string, password: string) {
  if (login.trim().toLowerCase() !== MANAGER_LOGIN || password !== MANAGER_PASSWORD) return false;
  window.sessionStorage.setItem(MANAGER_SESSION_KEY, 'true');
  window.dispatchEvent(new Event('orlov-manager-state-updated'));
  return true;
}

export function logoutManager() {
  window.sessionStorage.removeItem(MANAGER_SESSION_KEY);
  window.dispatchEvent(new Event('orlov-manager-state-updated'));
}
