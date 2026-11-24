'use strict';

const bellSvg = `
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>
  </svg>`;

function notificationButton() {
  const count = notifications.filter(item => !Number(item.isRead)).length;

  return `
    <button
      id="bell"
      class="btn quiet small bell"
      aria-label="Notifikasi, ${count} belum dibaca"
    >
      ${bellSvg}
      <span id="bell-count" ${count ? '' : 'hidden'}>${count}</span>
    </button>`;
}

function refreshBell() {
  const bell = document.getElementById('bell');
  if (!bell) return;

  const count = notifications.filter(item => !Number(item.isRead)).length;
  const label = bell.querySelector('span');

  label.textContent = count;
  label.hidden = !count;
  bell.setAttribute('aria-label', `Notifikasi, ${count} belum dibaca`);
}

function showSuccess(message) {
  const dialog = document.getElementById('success-dialog');
  document.getElementById('success-text').textContent = message;
  if (!dialog.open) dialog.showModal();
}

function openNotifications() {
  const dialog = document.getElementById('notification-dialog');
  paintNotifications();
  if (!dialog.open) dialog.showModal();
  refreshNotificationState(true);
}

function paintNotifications() {
  const target = document.getElementById('notification-content');
  const unread = notifications.some(item => !Number(item.isRead));

  const entries = notifications.length ? notifications.map(item => `
    <button
      type="button"
      class="notification-item ${Number(item.isRead) ? '' : 'unread'}"
      data-id="${Number(item.id)}"
      data-code="${escapeHTML(item.reportCode || '')}"
    >
      <strong>${escapeHTML(item.title)}</strong>
      <span>${escapeHTML(item.message)}</span>
      <small>${escapeHTML(item.createdAt)}</small>
    </button>`).join('') : '<p>Belum ada notifikasi.</p>';

  target.innerHTML = `
    <div class="actions notification-actions">
      <button
        type="button"
        class="btn quiet small"
        id="mark-read"
        ${unread ? '' : 'disabled'}
      >
        Tandai semua dibaca
      </button>
    </div>
    <p class="note" id="notification-error" role="status" hidden></p>
    ${entries}`;

  target.querySelector('#mark-read').onclick = () => {
    save('notifications-read', {}, () => {
      refreshBell();
      paintNotifications();
    }, 'notification-error');
  };

  target.querySelectorAll('.notification-item').forEach(button => {
    button.onclick = () => {
      const { id, code } = button.dataset;

      save('notifications-read', { id: Number(id) }, () => {
        document.getElementById('notification-dialog').close();

        const fallback = user.role === 'admin' ? 'kelola' : 'riwayat';
        const path = reports.some(report => report.id === code)
          ? 'laporan/' + code
          : fallback;

        go(path);
        refreshBell();
      }, 'notification-error');
    };
  });
}

function logoutAccount() {
  save('logout', {}, () => go('beranda'), 'app-error');
}

function refreshNotificationState(showFailure = false) {
  if (!user || requestInProgress || notificationRefresh) return;

  const accountId = user.id;
  const previousReports = JSON.stringify(reports);
  const previousNotifications = JSON.stringify(notifications);

  notificationRefresh = api().then(() => {
    const dialog = document.getElementById('notification-dialog');

    if (!user || user.id !== accountId) {
      if (dialog.open) dialog.close();
      render();
      return;
    }

    const route = location.hash.slice(1).split('/')[0];
    const showReports = route === 'dashboard'
      || (route === 'laporan' && user.role === 'mahasiswa');

    if (showReports && previousReports !== JSON.stringify(reports)) {
      render();
    }

    refreshBell();

    if (dialog.open && previousNotifications !== JSON.stringify(notifications)) {
      paintNotifications();
    }
    if (dialog.open) showError('notification-error', '');
  }).catch(() => {
    if (showFailure && document.getElementById('notification-dialog').open) {
      showError(
        'notification-error',
        'Gagal memuat pembaruan. Coba buka lonceng lagi.'
      );
    }
  }).finally(() => {
    notificationRefresh = null;
  });
}

function startNotificationPolling() {
  setInterval(() => {
    if (!document.hidden) refreshNotificationState();
  }, 15000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshNotificationState();
  });
}