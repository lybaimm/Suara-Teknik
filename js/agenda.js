'use strict';

const agendaStates = {
  draft: 'Draf',
  published: 'Terbit',
  cancelled: 'Dibatalkan',
};

let calendarMonth = '';
let calendarDate = '';
let calendarRefreshTimer;
let calendarPage = 0;
const calendarCompactQuery = matchMedia('(max-width: 670px)');

const agendaCategories = {
  upcoming: { label: 'Mendatang', description: 'Belum dimulai' },
  ongoing: { label: 'Berlangsung', description: 'Sedang dalam jam kegiatan' },
  completed: { label: 'Selesai', description: 'Jadwal sudah berlalu' },
  cancelled: { label: 'Dibatalkan', description: 'Kegiatan dibatalkan' },
};

function agendaCategory(item, now = Date.now()) {
  if (item.status === 'cancelled') return 'cancelled';
  const start = new Date(item.eventDate + 'T' + item.startTime + ':00+07:00').getTime();
  const end = new Date(item.eventDate + 'T' + (item.endTime ? item.endTime + ':00' : '23:59:59') + '+07:00').getTime();
  if (now < start) return 'upcoming';
  return now < end ? 'ongoing' : 'completed';
}

function agendaColorKey(items) {
  return `<table class="calendar-color-key" aria-label="Kategori agenda bulan ini"><thead><tr><th scope="col">Kategori</th><th scope="col">Jumlah</th></tr></thead><tbody>${Object.entries(agendaCategories).map(([key, category]) => `<tr><th scope="row"><span class="agenda-category" data-category="${key}"><i class="calendar-dot state-${key}" aria-hidden="true"></i>${category.label}</span><small>${category.description}</small></th><td>${items.filter(item => agendaCategory(item) === key).length}</td></tr>`).join('')}</tbody></table>`;
}

function agendaMonthTable(items) {
  if (!items.length) return '<p class="panel note">Tidak ada forum pada periode ini.</p>';
  return `<table class="calendar-forum-table"><caption class="calendar-table-caption">Ringkasan forum; buka Lihat detail untuk membaca informasi lengkap</caption><thead><tr><th scope="col">Forum & topik</th><th scope="col">Jadwal WIB</th><th scope="col">Status</th></tr></thead><tbody>${items.map(item => {
    const key = agendaCategory(item);
    return `<tr><td data-label="Forum"><strong class="agenda-summary-title">${escapeHTML(item.title)}</strong><p class="agenda-summary-topic">${escapeHTML(item.topics)}</p><button type="button" class="text-link agenda-detail-button" data-agenda-detail="${Number(item.id)}" aria-label="Lihat detail ${escapeHTML(item.title)}">Lihat detail →</button></td><td data-label="Jadwal"><time datetime="${escapeHTML(item.eventDate)}T${escapeHTML(item.startTime)}+07:00">${escapeHTML(agendaDateLabel(item.eventDate, { day: 'numeric', month: 'short' }))}<br>${escapeHTML(item.startTime)}${item.endTime ? '–' + escapeHTML(item.endTime) : ''}</time></td><td data-label="Status"><span class="agenda-category" data-category="${key}">${agendaCategories[key].label}</span></td></tr>`;
  }).join('')}</tbody></table>`;
}

function openAgendaDetail(id) {
  const item = publicAgendaItems().find(item => item.id === id);
  const dialog = document.getElementById('agenda-detail-dialog');
  if (!item || !dialog) return;
  const key = agendaCategory(item);
  document.getElementById('agenda-detail-title').textContent = item.title;
  document.getElementById('agenda-detail-content').innerHTML = `<span class="agenda-category" data-category="${key}">${agendaCategories[key].label}</span><dl class="agenda-detail-fields"><dt>Tanggal</dt><dd>${escapeHTML(agendaDateLabel(item.eventDate))}</dd><dt>Jam (WIB)</dt><dd>${escapeHTML(item.startTime)}${item.endTime ? '–' + escapeHTML(item.endTime) : ' · Jam selesai belum diisi'}</dd><dt>Tempat</dt><dd>${escapeHTML(item.building)} · ${escapeHTML(item.room)}</dd></dl><h4>Topik pembahasan</h4><p class="detail-copy">${escapeHTML(item.topics)}</p>`;
  dialog.onclose = () => document.querySelector(`[data-agenda-detail="${id}"]`)?.focus({ preventScroll: true });
  dialog.showModal();
}

function agendaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
}

function agendaDateLabel(key, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'Asia/Jakarta' })
    .format(new Date(key + 'T12:00:00+07:00'));
}

function publicAgendaItems() {
  return events.filter(item => item.isPublic && ['published', 'cancelled'].includes(item.status))
    .slice().sort((a, b) => (a.eventDate + a.startTime).localeCompare(b.eventDate + b.startTime));
}

function agendaCalendar() {
  const today = agendaToday();
  if (!calendarMonth) calendarMonth = today.slice(0, 7);
  const items = publicAgendaItems();
  const monthItems = items.filter(item => item.eventDate.startsWith(calendarMonth + '-'));
  const [year, month] = calendarMonth.split('-').map(Number);
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > days) return '<span class="calendar-blank" aria-hidden="true"></span>';
    const key = calendarMonth + '-' + String(day).padStart(2, '0');
    const onDate = monthItems.filter(item => item.eventDate === key);
    const kinds = Object.keys(agendaCategories).filter(kind => onDate.some(item => agendaCategory(item) === kind));
    const current = key === today ? ' aria-current="date"' : '';
    const content = `<span>${day}</span>`;
    if (!onDate.length) return `<span class="calendar-day${key < today ? ' past' : ''}"${current}>${content}</span>`;
    const label = agendaDateLabel(key) + ', ' + kinds.map(kind => onDate.filter(item => agendaCategory(item) === kind).length + ' ' + agendaCategories[kind].label.toLowerCase()).join(', ');
    const primary = ['ongoing', 'upcoming', 'completed', 'cancelled'].find(kind => kinds.includes(kind));
    return `<button type="button" class="calendar-day" data-agenda-date="${key}" data-agenda-kind="${primary}" aria-label="${escapeHTML(label)}" aria-pressed="${calendarDate === key}" aria-controls="agenda-day-list"${current}>${content}</button>`;
  }).join('');
  const shown = calendarDate ? monthItems.filter(item => item.eventDate === calendarDate) : monthItems;
  const pageSize = calendarCompactQuery.matches ? 2 : 4;
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  calendarPage = Math.max(0, Math.min(calendarPage, pages - 1));
  const pageItems = shown.slice(calendarPage * pageSize, (calendarPage + 1) * pageSize);
  const monthLabel = agendaDateLabel(calendarMonth + '-01', { month: 'long', year: 'numeric' });
  const title = calendarDate ? 'Forum ' + agendaDateLabel(calendarDate) : 'Forum bulan ' + monthLabel;
  return `<div class="calendar-layout">
    <section class="panel calendar-panel" aria-label="Kalender Forum Advokasi">
      <div class="calendar-toolbar">
        <button type="button" class="calendar-arrow" data-agenda-month="-1" aria-label="Bulan sebelumnya">‹</button>
        <h3 id="agenda-month-label" aria-live="polite">${escapeHTML(monthLabel)}</h3>
        <button type="button" class="calendar-arrow" data-agenda-month="1" aria-label="Bulan berikutnya">›</button>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => `<span>${day}</span>`).join('')}</div>
      <div class="calendar-days" role="group" aria-labelledby="agenda-month-label">${cells}</div>
      ${agendaColorKey(monthItems)}
      <div class="calendar-footer"><button type="button" class="text-link" data-agenda-today>Bulan ini</button><span class="note">${monthItems.length} forum dalam bulan ini</span></div>
      <p class="note calendar-hint">Pilih tanggal bertanda untuk menyaring tabel. Status waktu mengikuti jadwal WIB; tanpa jam selesai, status berlangsung sampai akhir hari.</p>
    </section>
    <section class="calendar-agenda" id="agenda-day-list" aria-live="polite" aria-atomic="true">
      <div class="calendar-agenda-inner">
        <div class="calendar-list-head"><h3>${escapeHTML(title)}</h3>${calendarDate ? '<button type="button" class="text-link" data-agenda-clear>Tampilkan semua forum bulan ini</button>' : '<p class="note">Ringkasan forum bulan ini. Buka detail untuk membaca topik dan lokasi lengkap.</p>'}</div>
        <div class="calendar-table-viewport">${agendaMonthTable(pageItems)}</div>
        <div class="calendar-pagination"><p class="note">${shown.length ? calendarPage * pageSize + 1 : 0}–${Math.min((calendarPage + 1) * pageSize, shown.length)} dari ${shown.length} forum</p><div><button type="button" class="calendar-arrow" data-agenda-page="-1" aria-label="Halaman forum sebelumnya" ${calendarPage === 0 ? 'disabled' : ''}>‹</button><span>${calendarPage + 1} / ${pages}</span><button type="button" class="calendar-arrow" data-agenda-page="1" aria-label="Halaman forum berikutnya" ${calendarPage + 1 >= pages ? 'disabled' : ''}>›</button></div></div>
      </div>
    </section>
  </div>`;
}

function wireAgendaCalendar() {
  clearInterval(calendarRefreshTimer);
  calendarCompactQuery.onchange = null;
  const root = document.getElementById('agenda-calendar');
  if (!root) return;
  calendarCompactQuery.onchange = () => { calendarPage = 0; root.innerHTML = agendaCalendar(); };
  root.onclick = event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-agenda-detail')) {
      openAgendaDetail(Number(button.dataset.agendaDetail));
      return;
    }
    let focus;
    if (button.hasAttribute('data-agenda-page')) {
      const delta = Number(button.dataset.agendaPage);
      calendarPage += delta;
      focus = `[data-agenda-page="${delta}"]`;
    } else if (button.hasAttribute('data-agenda-month')) {
      const delta = Number(button.dataset.agendaMonth);
      const [year, month] = calendarMonth.split('-').map(Number);
      const next = new Date(Date.UTC(year, month - 1 + delta, 1));
      calendarMonth = String(next.getUTCFullYear()) + '-' + String(next.getUTCMonth() + 1).padStart(2, '0');
      calendarDate = '';
      calendarPage = 0;
      focus = `[data-agenda-month="${delta}"]`;
    } else if (button.dataset.agendaDate) {
      calendarDate = calendarDate === button.dataset.agendaDate ? '' : button.dataset.agendaDate;
      calendarPage = 0;
      focus = `[data-agenda-date="${button.dataset.agendaDate}"]`;
    } else if (button.hasAttribute('data-agenda-today')) {
      calendarMonth = agendaToday().slice(0, 7);
      calendarDate = '';
      calendarPage = 0;
      focus = '[data-agenda-today]';
    } else if (button.hasAttribute('data-agenda-clear')) {
      calendarDate = '';
      calendarPage = 0;
      focus = '[data-agenda-today]';
    } else return;
    root.innerHTML = agendaCalendar();
    const target = root.querySelector(focus);
    (target?.disabled ? root.querySelector('.calendar-pagination button:not(:disabled), [data-agenda-today]') : target)?.focus({ preventScroll: true });
  };
  calendarRefreshTimer = setInterval(() => {
    if (document.hidden || !root.isConnected || document.getElementById('agenda-detail-dialog')?.open) return;
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const date = focused?.dataset.agendaDate;
    const month = focused?.dataset.agendaMonth;
    const page = focused?.dataset.agendaPage;
    const isToday = focused?.hasAttribute('data-agenda-today');
    root.innerHTML = agendaCalendar();
    if (date) root.querySelector(`[data-agenda-date="${date}"]`)?.focus({ preventScroll: true });
    else if (month) root.querySelector(`[data-agenda-month="${month}"]`)?.focus({ preventScroll: true });
    else if (page) root.querySelector(`[data-agenda-page="${page}"]`)?.focus({ preventScroll: true });
    else if (isToday) root.querySelector('[data-agenda-today]')?.focus({ preventScroll: true });
  }, 60000);
}

function agendaCards(items, admin = false) {
  if (!items.length) {
    return '<p class="panel note">Belum ada Forum Advokasi yang dijadwalkan.</p>';
  }

  return `<div class="agenda-grid">${items.map(item => `
    <article class="panel agenda-card">
      ${admin || item.status === 'cancelled'
        ? `<p class="agenda-type">${agendaStates[item.status]}</p>` : ''}
      <h3>${escapeHTML(item.title)}</h3>
      <p><time datetime="${escapeHTML(item.eventDate)}T${escapeHTML(item.startTime)}+07:00">
        ${escapeHTML(item.dateLabel)} · ${escapeHTML(item.startTime)}${item.endTime
          ? '–' + escapeHTML(item.endTime) : ''} WIB
      </time></p>
      <p>${escapeHTML(item.building)} · ${escapeHTML(item.room)}</p>
      <p class="detail-copy">${escapeHTML(item.topics)}</p>
      ${admin ? button('agenda-edit/' + item.id, 'Ubah agenda', 'quiet small') : ''}
    </article>`).join('')}</div>`;
}

function upcomingAgenda() {
  return `<section class="wrap upcoming" id="agenda-home" tabindex="-1" aria-labelledby="agenda-title">
    <div class="section-head">
      <div>
        <h2 id="agenda-title">Kalender Forum Advokasi</h2>
        <p>Forum Advokasi terbuka untuk mahasiswa. Datang langsung tanpa pendaftaran.</p>
      </div>
    </div>
    <div id="agenda-calendar">${agendaCalendar()}</div>
  </section>`;
}

function agendaPage(admin = false) {
  const title = admin ? 'Kelola Agenda' : 'Forum Advokasi mendatang';
  const description = admin
    ? 'Atur jadwal Forum Advokasi yang tampil di beranda.'
    : 'Forum Advokasi terbuka untuk mahasiswa. Datang langsung tanpa pendaftaran.';
  return screen(title, description, agendaCards(
    admin ? events : publicAgendaItems().filter(item => item.eventDate >= agendaToday()), admin
  ), {
    back: admin ? ['dashboard', 'Ringkasan'] : ['agenda-home', 'Beranda'],
    action: admin ? button('agenda-baru', 'Tambah agenda', 'primary', true) : '',
  });
}

function agendaForm(item) {
  const value = key => escapeHTML(item?.[key]);
  return screen(item ? 'Ubah agenda' : 'Tambah agenda', 'Jadwal Forum Advokasi', `
    <div class="panel">
      <form id="agenda-form">
        <label>Judul agenda
          <input name="title" required maxlength="150" value="${value('title')}">
        </label>
        <div class="form-grid">
          <label>Status publikasi
            <select name="status">${Object.entries(agendaStates).map(([key, label]) =>
              `<option value="${key}" ${key === item?.status ? 'selected' : ''}>${label}</option>`
            ).join('')}</select>
          </label>
          <label>Tanggal
            <input name="eventDate" type="date" required value="${value('eventDate')}">
          </label>
        </div>
        <div class="form-grid">
          <label>Jam mulai (WIB)
            <input name="startTime" type="time" required value="${value('startTime')}">
          </label>
          <label>Jam selesai (opsional)
            <input name="endTime" type="time" value="${value('endTime')}">
          </label>
        </div>
        <div class="form-grid">
          <label>Gedung
            <input name="building" required maxlength="150" value="${value('building')}">
          </label>
          <label>Ruang
            <input name="room" required maxlength="100" value="${value('room')}">
          </label>
        </div>
        <label>Topik pembahasan
          <textarea name="topics" required maxlength="2000"
            placeholder="Tulis pokok bahasan yang boleh diumumkan.">${value('topics')}</textarea>
        </label>
        <p id="agenda-error" class="alert" role="alert" hidden></p>
        <div class="actions">
          <button class="btn primary">Simpan agenda ${icon.arrow}</button>
          ${item ? '<button type="button" class="text-link danger" id="delete-agenda">Hapus agenda</button>' : ''}
        </div>
      </form>
    </div>`, { narrow: true, back: ['agenda-admin', 'Kelola Agenda'] });
}

function wireAgenda(item) {
  wireAgendaCalendar();
  const form = main.querySelector('#agenda-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form));
    if (item) fields.id = item.id;
    save(item ? 'event-edit' : 'event-create', fields, () => {
      go('agenda-admin');
      showSuccess('Agenda berhasil disimpan.');
    }, 'agenda-error');
  });

  form.querySelector('#delete-agenda')?.addEventListener('click', () => {
    confirmRemoval('agenda', () => {
      save('event-delete', { id: item.id }, () => {
        go('agenda-admin');
        showSuccess('Agenda berhasil dihapus.');
      }, 'agenda-error');
    });
  });
}
