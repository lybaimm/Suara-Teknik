'use strict';

const homePages = ['beranda', 'alur', 'tentang', 'agenda-home'];
const routes = [
  ...homePages, 'masuk', 'daftar', 'dashboard', 'buat', 'riwayat', 'laporan', 'edit', 'kelola', 'forum',
  'agenda', 'agenda-admin', 'agenda-baru', 'agenda-edit',
];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const main = document.querySelector('#main');
const header = document.querySelector('#header');

let pendingType = '';
let activeView = '';
let homeRole;
let screenAnimation;
let exitAnimation;
let viewTransitionVersion = 0;
let homeNavFrame = 0;
let homeNavTarget = null;
let homeRevealObserver;
let heroTitleObserver;
let heroTypingFrame = 0;
let dashboardCountFrame = 0;
let reportResizeCleanup;
const revealedHomeSections = new Set();

history.scrollRestoration = 'manual';
if (performance.getEntriesByType('navigation')[0]?.type === 'reload'
    && homePages.includes(location.hash.slice(1))) {
  history.replaceState(null, '', '#beranda');
}

function escapeHTML(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
}

function go(path) {
  const hash = '#' + path;
  if (location.hash !== hash) history.pushState(null, '', hash);
  render({ navigating: true });
}

function scrollHome(page, navigating, instant = false) {
  const behavior = navigating && !instant && !reducedMotion.matches ? 'smooth' : 'instant';
  homeNavTarget = null;
  if (page === 'beranda') {
    if (navigating) homeNavTarget = { page, top: 0, arrived: false };
    if (navigating) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior });
    queueHomeNavUpdate();
    return;
  }
  const section = document.getElementById(page);
  if (navigating) {
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    const limit = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    homeNavTarget = { page, top: Math.max(0, Math.min(limit, section.getBoundingClientRect().top + scrollY - margin)), arrived: false };
  }
  if (navigating) section.focus({ preventScroll: true });
  section.scrollIntoView({ behavior, block: 'start' });
  queueHomeNavUpdate();
}

function setActiveNav(page) {
  for (const link of header.querySelectorAll('nav a')) {
    const active = link.hash === '#' + page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  syncNavIndicator();
}

function updateHomeNavFromScroll() {
  homeNavFrame = 0;
  if (activeView !== 'home' || !header.querySelector('nav a[href="#beranda"]')) return;
  if (homeNavTarget) {
    const distance = Math.abs(scrollY - homeNavTarget.top);
    if (distance <= 2) homeNavTarget.arrived = true;
    if (homeNavTarget.arrived && distance > 2) homeNavTarget = null;
    else {
      setActiveNav(homeNavTarget.page);
      return;
    }
  }
  const headerBottom = document.querySelector('.top').getBoundingClientRect().bottom;
  // Short sections near the footer must become active while they are visible,
  // before the page reaches its maximum scroll position.
  const marker = headerBottom + (innerHeight - headerBottom) * .5;
  let page = 'beranda';
  for (const id of ['agenda-home', 'alur', 'tentang']) {
    const section = document.getElementById(id);
    if (section && section.getBoundingClientRect().top <= marker) page = id;
  }
  if (scrollY > 0 && document.documentElement.scrollHeight - (scrollY + innerHeight) <= 2) {
    page = 'tentang';
  }
  setActiveNav(page);
}

function queueHomeNavUpdate() {
  if (!homeNavFrame) homeNavFrame = requestAnimationFrame(updateHomeNavFromScroll);
}

function releaseHomeNavTarget() {
  homeNavTarget = null;
  queueHomeNavUpdate();
}

function revealHomeSections({ skipVisible = false } = {}) {
  homeRevealObserver?.disconnect();
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  homeRevealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const section = entry.target;
      homeRevealObserver.unobserve(section);
      const key = section.id || section.className;
      if (revealedHomeSections.has(key)) continue;
      revealedHomeSections.add(key);
      section.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 650,
        easing: 'cubic-bezier(.2,.65,.35,1)',
      });
    }
  }, { rootMargin: '0px 0px -24px 0px', threshold: 0 });

  for (const section of main.querySelectorAll('.hero, .start, #agenda-home, #alur, #tentang')) {
    const bounds = section.getBoundingClientRect();
    if (skipVisible && bounds.top < innerHeight && bounds.bottom > 0) {
      revealedHomeSections.add(section.id || section.className);
      continue;
    }
    homeRevealObserver.observe(section);
  }
}

function revealHeroTitle() {
  heroTitleObserver?.disconnect();
  const title = document.getElementById('hero-title');
  if (!title || reducedMotion.matches) return;
  const typed = main.querySelector('.hero-description-typed');
  const fullText = main.querySelector('.hero-description-copy')?.textContent || '';
  if (typed) typed.textContent = '';
  title.classList.add('hero-title-pending');
  const show = () => {
    title.classList.remove('hero-title-pending');
    title.classList.add('hero-title-revealing');
    heroTitleObserver?.disconnect();
    if (typed) typeHeroDescription(typed, fullText);
  };
  const bounds = title.getBoundingClientRect();
  if ((bounds.top < innerHeight && bounds.bottom > 0) || !('IntersectionObserver' in window)) {
    show();
    return;
  }
  heroTitleObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) show();
  }, { rootMargin: '0px 0px -24px 0px' });
  heroTitleObserver.observe(title);
}

function typeHeroDescription(element, text) {
  cancelAnimationFrame(heroTypingFrame);
  const fragment = document.createDocumentFragment();
  const letters = Array.from(text, letter => {
    const span = document.createElement('span');
    span.className = 'hero-type-letter';
    span.textContent = letter;
    fragment.append(span);
    return span;
  });
  element.replaceChildren(fragment);
  const start = performance.now() + 650;
  const stagger = 12;
  const fade = 140;
  const complete = new Set();
  function tick(now) {
    if (!element.isConnected) { heroTypingFrame = 0; return; }
    if (reducedMotion.matches) {
      element.textContent = text;
      heroTypingFrame = 0;
      return;
    }
    letters.forEach((letter, index) => {
      if (complete.has(index)) return;
      const progress = Math.max(0, Math.min(1, (now - start - index * stagger) / fade));
      if (progress > 0) letter.style.opacity = String(1 - (1 - progress) ** 2);
      if (progress === 1) complete.add(index);
    });
    heroTypingFrame = complete.size < letters.length ? requestAnimationFrame(tick) : 0;
  }
  heroTypingFrame = requestAnimationFrame(tick);
}

function animateDashboardCounts({ delay = 140 } = {}) {
  if (reducedMotion.matches) return;
  const counters = [...main.querySelectorAll('[data-count-target]')];
  if (!counters.length) return;
  const targets = counters.map(counter => Number(counter.dataset.countTarget));
  counters.forEach(counter => { counter.textContent = '0'; });
  const start = performance.now() + delay;
  function tick(now) {
    const progress = Math.max(0, Math.min(1, (now - start) / 500));
    const eased = 1 - (1 - progress) ** 2;
    counters.forEach((counter, index) => {
      counter.textContent = String(Math.floor(targets[index] * eased));
    });
    dashboardCountFrame = progress < 1 ? requestAnimationFrame(tick) : 0;
  }
  dashboardCountFrame = requestAnimationFrame(tick);
}

function afterLogin() {
  const page = user.role === 'mahasiswa' && pendingType
    ? 'buat/' + pendingType
    : 'dashboard';
  pendingType = '';
  go(page);
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
  reportResizeCleanup?.();
  reportResizeCleanup = null;
  const results = document.getElementById('results');
  if (!results) return;
  const management = results.classList.contains('management-results');
  const fields = ['search', 'filter-category', 'filter-status', 'filter-method', 'filter-period']
    .map(id => document.getElementById(id));

  function update(resetPage = true) {
    if (forumOnly && resetPage) forumPageIndex = 0;
    if (management && resetPage) managementPageIndex = 0;
    const [query, category, status, method, period] = fields.map(field => field?.value || '');
    const normalized = query.trim().toLowerCase();
    const matches = visibleReports().filter(report =>
      (!kind || report.type.toLowerCase() === kind) &&
      (!category || report.category === category) &&
      (!status || report.status === status) &&
      (!forumOnly || report.method === 'forum') &&
      (!method || (report.method || 'pending') === method) &&
      (!period || report.forumPeriod === period) &&
      `${report.title} ${report.id}${forumOnly ? ' ' + report.description + ' ' + (report.forumResult || '') : ''}`.toLowerCase().includes(normalized)
    );
    results.innerHTML = forumOnly ? forumListing(matches) : management ? managementListing(matches) : listing(matches);
  }

  fields.forEach(field => field?.addEventListener('input', () => update()));
  if (forumOnly || management) {
    const scope = forumOnly ? 'forum' : 'report';
    results.addEventListener('click', event => {
      const button = event.target.closest(`[data-${scope}-step]`);
      if (!button || button.disabled) return;
      const step = Number(button.getAttribute(`data-${scope}-step`));
      if (step !== -1 && step !== 1) return;
      if (forumOnly) forumPageIndex += step;
      else managementPageIndex += step;
      update(false);
      results.querySelector('.forum-result-summary, .report-result-summary')?.focus({ preventScroll: true });
      results.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    });
    const onResize = () => update();
    reportPageQuery.addEventListener('change', onResize);
    reportResizeCleanup = () => reportPageQuery.removeEventListener('change', onResize);
  }
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

function confirmRemoval(label, proceed) {
  const dialog = document.getElementById('confirm');
  dialog.querySelector('#confirm-title').textContent = `Hapus ${label} ini?`;
  dialog.querySelector('#confirm-description').textContent = `${label[0].toUpperCase()}${label.slice(1)} ini akan dihapus.`;
  dialog.querySelector('[value=hapus]').textContent = `Hapus ${label}`;
  dialog.onsubmit = event => {
    event.preventDefault();
    const choice = event.submitter?.value || 'batal';
    dialog.close(choice);
    if (choice === 'hapus') proceed();
  };
  dialog.showModal();
}

function wireDetail(report) {
  if (!report) return;
  main.querySelector('#delete-report')?.addEventListener('click', () => {
    confirmRemoval('laporan', () => {
      save('delete', { id: report.id }, () => {
        go('riwayat');
        showSuccess('Laporan berhasil dihapus.');
      }, 'app-error');
    });
  });

  const form = main.querySelector('#admin-form');
  if (!form) return;
  const { method, status, response, forumPeriod, forumResult } = form.elements;
  method.addEventListener('change', () => {
    document.getElementById('forum-period').hidden = method.value !== 'forum';
    document.getElementById('forum-result').hidden = method.value !== 'forum';
    status.disabled = !method.value;
    status.innerHTML = followUpOptions(method.value, report.status);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (user?.role !== 'admin') return;
    if (!method.value || !status.value) {
      showError('admin-error', 'Pilih metode dan status tindak lanjut.');
      return;
    }
    save('follow-up', {
      id: report.id,
      status: status.value,
      response: response.value.trim(),
      method: method.value,
      forumPeriod: forumPeriod.value,
      forumResult: forumResult.value.trim(),
    }, () => {
      render();
      showSuccess('Tindak lanjut berhasil disimpan.');
    }, 'admin-error');
  });
}

function render({ navigating = false, afterExit = false } = {}) {
  if (!afterExit) {
    viewTransitionVersion++;
    exitAnimation?.cancel();
    exitAnimation = null;
  }
  main.inert = false;
  const [route = 'beranda', part = ''] = (location.hash.slice(1) || 'beranda').split('/');
  const page = routes.includes(route) ? route : 'beranda';
  const kind = ['aspirasi', 'pengaduan'].includes(part) ? part : '';
  const onHome = homePages.includes(page);
  const authPage = page === 'masuk' || page === 'daftar';

  if (!onHome && page !== 'agenda' && !authPage && !user) {
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
  if (navigating && changedView && activeView && !afterExit && !reducedMotion.matches) {
    const version = viewTransitionVersion;
    const opacity = getComputedStyle(main).opacity;
    const transform = getComputedStyle(main).transform;
    screenAnimation?.cancel();
    cancelAnimationFrame(dashboardCountFrame);
    dashboardCountFrame = 0;
    homeRevealObserver?.disconnect();
    main.inert = true;
    const leaving = main.animate([
      { opacity, transform },
      { opacity: 0, transform: 'translateY(-6px)' },
    ], { duration: 150, easing: 'ease-in', fill: 'forwards' });
    exitAnimation = leaving;
    leaving.finished.then(() => {
      if (version !== viewTransitionVersion) return;
      leaving.cancel();
      exitAnimation = null;
      render({ navigating: true, afterExit: true });
    }).catch(() => {});
    return;
  }
  activeView = nextView;
  homeRole = user?.role;
  renderHeader(page);

  let content;
  let report;
  let agendaItem;
  const student = user?.role === 'mahasiswa';
  if (onHome) content = home();
  if (page === 'agenda') content = agendaPage();
  if (user?.role === 'admin') {
    if (page === 'agenda-admin') content = agendaPage(true);
    if (page === 'agenda-baru') content = agendaForm();
    if (page === 'agenda-edit') {
      agendaItem = events.find(item => String(item.id) === part);
      if (agendaItem) content = agendaForm(agendaItem);
    }
  }
  if (authPage) content = auth(page === 'daftar');
  if (page === 'dashboard') content = dashboard();
  if (page === 'riwayat' && student || page === 'kelola' && user?.role === 'admin') {
    content = reportHistory(page === 'kelola', kind);
  }
  if (page === 'forum' && user) content = forumAdvocacyPage();
  if (page === 'buat' && student) content = reportForm(null, kind);
  if (page === 'laporan' || page === 'edit') {
    report = visibleReports().find(item => item.id === part);
    if (report && page === 'laporan') content = detail(report);
    if (report && page === 'edit' && student && report.status === statuses[0]) {
      content = reportForm(report);
    }
  }

  cancelAnimationFrame(dashboardCountFrame);
  dashboardCountFrame = 0;
  cancelAnimationFrame(heroTypingFrame);
  heroTypingFrame = 0;
  main.innerHTML = content || screen(
    'Halaman tidak tersedia',
    'Periksa kembali pilihanmu atau buka dashboard.',
    button('dashboard', 'Ke dashboard', 'primary')
  );
  wireAuth(page);
  wireAgenda(agendaItem);
  wireFilters(kind, page === 'forum');
  if (page === 'laporan') wireDetail(report);
  if (page === 'buat' || page === 'edit') wireReport(report);

  if (changedView) screenAnimation?.cancel();
  homeRevealObserver?.disconnect();
  heroTitleObserver?.disconnect();
  if (onHome) {
    scrollHome(page, navigating, changedView);
    revealHomeSections({ skipVisible: changedView });
    revealHeroTitle();
  } else if (changedView) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (navigating) main.focus({ preventScroll: true });
  }
  if (changedView && !reducedMotion.matches) {
    screenAnimation = main.animate(
      [
        { opacity: 0, transform: afterExit ? 'translateY(8px)' : 'none' },
        { opacity: 1, transform: 'none' },
      ],
      { delay: afterExit ? 0 : 140, duration: afterExit ? 380 : 600, fill: 'backwards', easing: 'cubic-bezier(.2,.65,.35,1)' }
    );
  }
  if (['dashboard', 'forum'].includes(page) && user && changedView) {
    animateDashboardCounts({ delay: afterExit ? 0 : 140 });
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
  if (!reducedMotion.matches) {
    header.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 140, duration: 600, fill: 'backwards', easing: 'ease-out' });
  }
  startNotificationPolling();
  window.addEventListener('hashchange', () => render({ navigating: true }));
  window.addEventListener('scroll', queueHomeNavUpdate, { passive: true });
  window.addEventListener('wheel', releaseHomeNavTarget, { passive: true });
  window.addEventListener('touchmove', releaseHomeNavTarget, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseHomeNavTarget();
  });
  window.addEventListener('resize', queueHomeNavUpdate);
  window.addEventListener('resize', syncNavIndicator);
  window.addEventListener('load', queueHomeNavUpdate);
  document.fonts.ready.then(() => {
    queueHomeNavUpdate();
    syncNavIndicator();
  });
}

start();
