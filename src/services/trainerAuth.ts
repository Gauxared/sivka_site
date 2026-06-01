const TRAINER_SESSION_KEY = 'orlov_trainer_session';
const TRAINER_PASSWORD = 'trainer123';

export function getAuthorizedTrainerId() {
  return window.sessionStorage.getItem(TRAINER_SESSION_KEY);
}

export function isTrainerAuthorized() {
  return Boolean(getAuthorizedTrainerId());
}

export function loginTrainer(trainerId: string, password: string) {
  if (!trainerId || password !== TRAINER_PASSWORD) return false;
  window.sessionStorage.setItem(TRAINER_SESSION_KEY, trainerId);
  window.dispatchEvent(new Event('orlov-trainer-state-updated'));
  return true;
}

export function logoutTrainer() {
  window.sessionStorage.removeItem(TRAINER_SESSION_KEY);
  window.dispatchEvent(new Event('orlov-trainer-state-updated'));
}
