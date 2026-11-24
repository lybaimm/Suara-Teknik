'use strict';

const agendaStates = {
  draft: 'Draf',
  published: 'Terbit',
  cancelled: 'Dibatalkan',
};

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
  const items = events.filter(item => item.isPublic).slice(0, 3);
  return `<section class="wrap upcoming" id="agenda-home" tabindex="-1" aria-labelledby="agenda-title">
    <div class="section-head">
      <div>
        <h2 id="agenda-title">Forum Advokasi mendatang</h2>
        <p>Forum Advokasi terbuka untuk mahasiswa. Datang langsung tanpa pendaftaran.</p>
      </div>
      <a class="text-link" href="#agenda">Lihat semua agenda ${icon.arrow}</a>
    </div>
    ${agendaCards(items)}
  </section>`;
}

function agendaPage(admin = false) {
  const title = admin ? 'Kelola Agenda' : 'Forum Advokasi mendatang';
  const description = admin
    ? 'Atur jadwal Forum Advokasi yang tampil di beranda.'
    : 'Forum Advokasi terbuka untuk mahasiswa. Datang langsung tanpa pendaftaran.';
  return screen(title, description, agendaCards(
    admin ? events : events.filter(item => item.isPublic), admin
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
