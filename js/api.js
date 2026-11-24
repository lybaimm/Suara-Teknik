'use strict';

let reports = [];
let events = [];
let user = null;
let csrf = '';
let notifications = [];
let requestInProgress = false;
let notificationRefresh = null;

async function api(action, data = {}) {
  const options = action ? {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ ...data, action }),
  } : {};

  const response = await fetch('api/index.php', options);
  let state;

  try {
    state = await response.json();
  } catch {
    throw new Error('Buka Suara Teknik melalui server web yang mendukung PHP.');
  }

  if (!response.ok) {
    throw new Error(state.error || 'Permintaan belum berhasil.');
  }

  user = state.user;
  reports = state.reports;
  events = state.events || [];
  csrf = state.csrf;
  notifications = state.notifications || [];

  return state;
}

async function save(action, data, onSuccess, errorId) {
  if (notificationRefresh) await notificationRefresh;
  if (requestInProgress) return;

  requestInProgress = true;
  try {
    const state = await api(action, data);
    onSuccess(state);
  } catch (error) {
    showError(errorId, error.message);
  } finally {
    requestInProgress = false;
  }
}