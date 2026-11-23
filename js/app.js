'use strict';

const homePages = ['beranda', 'alur', 'tentang'];
const routes = [
  ...homePages, 'masuk', 'daftar', 'dashboard', 'buat', 'riwayat', 'laporan', 'edit', 'kelola', 'forum',
];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const main = document.querySelector('#main');
const header = document.querySelector('#header');

let pendingType = '';
let activeView = '';
let homeRole;
let screenAnimation;

history.scrollRestoration = 'manual';

function escapeHTML(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
}

function go(path) {
  const hash = '#' + path;
  if (location.hash !== hash) history.pushState(null, '', hash);
  render({ navigating: true });
}

function scrollHome(page, navigating) {
  const behavior = navigating && !reducedMotion.matches ? 'smooth' : 'instant';
  if (page === 'beranda') {
    if (navigating) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior });
    return;
  }
  const section = document.getElementById(page);
  if (navigating) section.focus({ preventScroll: true });
  section.scrollIntoView({ behavior, block: 'start' });
}

function setActiveNav(page) {
  for (const link of header.querySelectorAll('nav a')) {
    const active = link.hash === '#' + page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function afterLogin() {
  const page = user.role === 'mahasiswa' && pendingType
    ? 'buat/' + pendingType
    : 'dashboard';
  pendingType = '';
  go(page);
  offerPush();
}

function showError(id, message) {
  const element = document.getElementById(id) || document.getElementById('app-error');
  element.textContent = message;
  element.hidden = !message;
}

function wireAuth(page) {
  main.querySelector('#auth-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    if (page === 'daftar') {
      save('register', data, () => {
        go(pendingType ? 'masuk/' + pendingType : 'masuk');
      }, 'auth-error');
      return;
    }

    save('login', data, afterLogin, 'auth-error');
  });
}

function wireFilters(kind, forumOnly = false) {
  const results = document.getElementById('results');
  if (!results) return;
  const fields = ['search', 'filter-category', 'filter-status', 'filter-method', 'filter-period']
    .map(id => document.getElementById(id));

  function update() {
    const [query, category, status, method, period] = fields.map(field => field?.value || '');
    const normalized = query.trim().toLowerCase();
    const matches = visibleReports().filter(report =>
      (!kind || report.type.toLowerCase() === kind) &&
      (!category || report.category === category) &&
      (!status || report.status === status) &&
      (!forumOnly || report.method === 'forum') &&
      (!method || (report.method || 'pending') === method) &&
      (!period || report.forumPeriod === period) &&
      `${report.title} ${report.id}`.toLowerCase().includes(normalized)
    );
    results.innerHTML = listing(matches);
  }

  fields.forEach(field => field?.addEventListener('input', update));
}

function wireReport(report) {
  const form = main.querySelector('#report-form');
  if (!form) return;

  let photo;
  let reading = null;
  const picker = form.elements.photo;
  const preview = document.getElementById('photo-preview');

  picker.addEventListener('change', () => {
    const file = picker.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 3 * 1024 * 1024) {
      picker.value = '';
      showError('report-error', 'Pilih foto JPG, PNG, atau WebP hingga 3 MB.');
      return;
    }

    showError('report-error', '');
    const reader = new FileReader();
    const attempt = new Promise(resolve => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    reading = attempt;
    attempt.then(result => {
      if (reading !== attempt) return;
      reading = null;
      if (!form.isConnected) return;
      if (!result) {
        showError('report-error', 'Foto gagal dibaca. Silakan pilih ulang.');
        return;
      }
      photo = result;
      preview.src = photo;
      preview.hidden = false;
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (reading) await reading;
    if (!form.isConnected) return;

    const data = new FormData(form);
    const keys = ['type', 'category', 'title', 'location', 'description'];
    const fields = Object.fromEntries(keys.map(key => [key, data.get(key).trim()]));
    if (Object.values(fields).some(value => !value)) {
      showError('report-error', 'Lengkapi semua bagian yang wajib.');
      return;
    }
    if (photo) fields.photo = photo;
    if (report) fields.id = report.id;

    save(report ? 'edit' : 'create', fields, state => {
      go(state.reportId ? 'laporan/' + state.reportId : 'riwayat');
      showSuccess(report ? 'Perubahan laporan berhasil disimpan.' : 'Laporan berhasil dikirim.');
    }, 'report-error');
  });
}

function wireDetail(report) {
  if (!report) return;
  main.querySelector('#delete-report')?.addEventListener('click', () => {
    const dialog = document.getElementById('confirm');
    dialog.returnValue = 'batal';
    dialog.showModal();
    dialog.addEventListener('close', () => {
      if (dialog.returnValue !== 'hapus') return;
      save('delete', { id: report.id }, () => { go('riwayat'); showSuccess('Laporan berhasil dihapus.'); }, 'app-error');
    }, { once: true });
  });

  const adminForm = main.querySelector('#admin-form');
  if (!adminForm) return;
  const response = adminForm.elements.response;
  adminForm.elements.method.addEventListener('change', () => {
    const method=adminForm.elements.method.value;
    document.getElementById('forum-period').hidden=method!=='forum';
    document.getElementById('forum-result').hidden=method!=='forum';
    adminForm.elements.status.innerHTML=options(methodStatuses(method),method==='forum'?statuses[5]:statuses[2]);
  });
  adminForm.addEventListener('input', () => response.setCustomValidity(''));
  adminForm.addEventListener('submit', event => {
    event.preventDefault();
    if (user?.role !== 'admin') return;

    const status = adminForm.elements.status.value;
    const value = response.value.trim();
    const rejected = status === 'Ditolak';
    if (rejected && !value) {
      response.setCustomValidity('Tulis alasan penolakan.');
      response.reportValidity();
      return;
    }
    save('follow-up', { id: report.id, status, response: value, method: adminForm.elements.method.value, forumPeriod: adminForm.elements.forumPeriod.value, forumResult: adminForm.elements.forumResult.value }, () => {
      render();
      showSuccess('Tindak lanjut berhasil disimpan. Status: ' + status + '.');
    }, 'admin-error');
  });
}

function render({ navigating = false } = {}) {
  const [route = 'beranda', part = ''] = (location.hash.slice(1) || 'beranda').split('/');
  const page = routes.includes(route) ? route : 'beranda';
  const kind = ['aspirasi', 'pengaduan'].includes(part) ? part : '';
  const onHome = homePages.includes(page);
  const authPage = page === 'masuk' || page === 'daftar';

  if (!onHome && !authPage && !user) {
    go(page === 'buat' && kind ? 'masuk/' + kind : 'masuk');
    return;
  }
  if (authPage && user) {
    go('dashboard');
    return;
  }
  if (authPage) pendingType = kind;

  if (onHome && activeView === 'home' && homeRole === user?.role) {
    setActiveNav(page);
    scrollHome(page, navigating);
    return;
  }

  const nextView = onHome ? 'home' : page + '/' + part;
  const changedView = activeView !== nextView;
  activeView = nextView;
  homeRole = user?.role;
  renderHeader(page);

  let content;
  let report;
  const student = user?.role === 'mahasiswa';
  if (onHome) content = home();
  if (authPage) content = auth(page === 'daftar');
  if (page === 'dashboard') content = dashboard();
  if (page === 'riwayat' && student || page === 'kelola' && user?.role === 'admin') {
    content = reportHistory(page === 'kelola', kind);
  }
  if (page === 'forum' && user?.role === 'admin') content = reportHistory(true, '', true);
  if (page === 'buat' && student) content = reportForm(null, kind);
  if (page === 'laporan' || page === 'edit') {
    report = visibleReports().find(item => item.id === part);
    if (report && page === 'laporan') content = detail(report);
    if (report && page === 'edit' && student && report.status === statuses[0]) {
      content = reportForm(report);
    }
  }

  main.innerHTML = content || screen(
    'Halaman tidak tersedia',
    'Periksa kembali pilihanmu atau buka dashboard.',
    button('dashboard', 'Ke dashboard', 'primary')
  );
  wireAuth(page);
  wireFilters(kind, page === 'forum');
  if (page === 'laporan') wireDetail(report);
  if (page === 'buat' || page === 'edit') wireReport(report);

  screenAnimation?.cancel();
  if (onHome) {
    scrollHome(page, navigating);
  } else if (changedView) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (navigating) main.focus({ preventScroll: true });
  }
  if (navigating && changedView && !reducedMotion.matches &&
      page !== 'alur' && page !== 'tentang') {
    screenAnimation = main.firstElementChild.animate(
      [
        { opacity: .72, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 210, easing: 'cubic-bezier(.2,.65,.35,1)' }
    );
  }
}

document.addEventListener('click', event => {
  const modifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  if (event.defaultPrevented || event.button !== 0 || modifiedClick) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.hasAttribute('target') || link.hasAttribute('download')) return;
  event.preventDefault();
  if (link.classList.contains('skip')) {
    main.focus();
    return;
  }
  go(link.hash.slice(1));
});

async function start() {
  try {
    await api();
  } catch (error) {
    showError('app-error', error.message);
  }
  render();
  startNotificationPolling();
  window.addEventListener('hashchange', () => render({ navigating: true }));
}

start();
