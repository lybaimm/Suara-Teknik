'use strict';

function svg(path) {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${path}</svg>`;
}

const icon = {
  arrow: svg('<path d="M4 12h15m-6-6 6 6-6 6"/>'),
  diagonal: svg('<path d="M6 18 18 6M8 6h10v10"/>'),
  bubble: svg('<path d="M4 5h16v12H9l-5 4zM8 9h8m-8 4h5"/>'),
  flag: svg('<path d="M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>'),
  pin: svg(`
    <path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/>
    <circle cx="12" cy="10" r="2"/>`),
};

const homeLinks = [
  ['beranda', 'Beranda'],
  ['agenda-home', 'Agenda'],
  ['alur', 'Cara Kerja'],
  ['tentang', 'Tentang'],
];
const memberLinks = [
  ['dashboard', 'Ringkasan'],
  ['riwayat', 'Riwayat Laporan'],
  ['agenda', 'Agenda'],
];
const adminLinks = [
  ['dashboard', 'Ringkasan'],
  ['kelola', 'Manajemen Laporan'],
  ['forum', 'Forum Advokasi'],
  ['agenda-admin', 'Kelola Agenda'],
];

function button(href, label, style = '', arrow = false) {
  return `<a class="btn ${style}" href="#${href}">${label}${arrow ? icon.arrow : ''}</a>`;
}

function renderHeader(page) {
  const admin = user?.role === 'admin';
  const links = user ? (admin ? adminLinks : memberLinks) : homeLinks;
  const reportPage = page === 'laporan' || page === 'edit';
  let activePage = reportPage ? (admin ? 'kelola' : 'riwayat') : page;
  if (page === 'agenda-baru' || page === 'agenda-edit') activePage = 'agenda-admin';
  if (page === 'agenda' && !user) activePage = 'agenda-home';
  const navigation = links.map(([href, name]) => {
    const active = activePage === href ? 'class="active" aria-current="page"' : '';
    return `<a href="#${href}" ${active}>${name}</a>`;
  }).join('');
  const account = user
    ? '<button type="button" class="btn quiet small" id="logout">Keluar</button>'
    : (registrationOpen ? button('daftar', 'Daftar', 'quiet small') : '')
      + button('masuk', 'Masuk', 'primary small');

  header.innerHTML = `
    <a class="brand" href="#beranda">
      <span class="mark">
        <img src="assets/logo-suara-teknik.png" alt="" width="755" height="494">
      </span>
      Suara Teknik
    </a>
    <nav aria-label="Navigasi utama">${navigation}<span class="nav-indicator" aria-hidden="true" hidden></span></nav>
    <div class="account">${user ? notificationButton() : ''}${account}</div>`;

  header.querySelector('#logout')?.addEventListener('click', logoutAccount);
  header.querySelector('#bell')?.addEventListener('click', openNotifications);
  requestAnimationFrame(syncNavIndicator);
}

function syncNavIndicator() {
  const nav = header.querySelector('nav');
  const indicator = nav?.querySelector('.nav-indicator');
  const active = nav?.querySelector('a.active');
  if (!indicator) return;
  indicator.hidden = !active;
  if (!active) return;
  const bounds = nav.getBoundingClientRect();
  const link = active.getBoundingClientRect();
  const mobile = matchMedia('(max-width: 1000px)').matches;
  indicator.style.width = `${link.width}px`;
  indicator.style.height = `${mobile ? link.height : 2}px`;
  indicator.style.transform = `translate(${link.left - bounds.left + nav.scrollLeft}px, ${link.top - bounds.top + (mobile ? 0 : link.height + 6)}px)`;
  if (!indicator.classList.contains('ready')) {
    indicator.getBoundingClientRect();
    indicator.classList.add('ready');
  }
}

function home() {
  const facultyMap = 'https://www.google.com/maps/place/' +
    'Fakultas+Teknik+Universitas+Jenderal+Soedirman/@-7.4287217,109.3337591,17z/' +
    'data=!3m1!4b1!4m6!3m5!1s0x2e6559814ade5b79:0xaef1b7bab5cba0f0' +
    '!8m2!3d-7.428727!4d109.336334!16s%2Fg%2F1pzq_62b0';
  const admin = user?.role === 'admin';
  const start = user ? (admin ? 'kelola' : 'buat') : 'masuk';
  const action = button(start, admin ? 'Lihat laporan' : 'Buat laporan', 'primary', true);
  return `
    <div class="wrap">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <h1 id="hero-title">Suarakan ide,<br><span>Wujudkan</span><br>perubahan.</h1>
          <p class="intro">
            Satu tempat untuk menyampaikan gagasan, melaporkan kendala,
            dan melihat bagaimana setiap suara ditindaklanjuti.
          </p>
          <div class="actions">
            ${action}
            <a class="text-link" href="#alur">Lihat cara kerja ${icon.diagonal}</a>
          </div>
        </div>
        <figure>
          <div class="hero-photo-frame">
            <img class="hero-photo" src="assets/fakultas-teknik.webp"
              alt="Tampak depan gedung Fakultas Teknik Universitas Jenderal Soedirman"
              width="1500" height="975" fetchpriority="high">
            <a class="photo-tag" href="${facultyMap}"
              target="_blank" rel="noopener noreferrer"
              aria-label="Buka lokasi Fakultas Teknik di Google Maps (tab baru)">
              ${icon.pin} Fakultas Teknik
            </a>
          </div>
          <figcaption>Fakultas Teknik, Universitas Jenderal Soedirman</figcaption>
        </figure>
      </section>
      <section class="start" aria-labelledby="start-title">
        <div class="section-head">
          <h2 id="start-title">Apa yang ingin kamu sampaikan?</h2>
        </div>
        <div class="choices">
          <a class="choice" href="#${start}/aspirasi">
            <span class="tile-icon">${icon.bubble}</span>
            <div>
              <h3>Aspirasi</h3>
              <p>Punya gagasan? Kami siap mendengarnya.</p>
            </div>
            ${icon.diagonal}
          </a>
          <a class="choice" href="#${start}/pengaduan">
            <span class="tile-icon">${icon.flag}</span>
            <div>
              <h3>Pengaduan</h3>
              <p>Laporkan hal yang perlu diperbaiki.</p>
            </div>
            ${icon.diagonal}
          </a>
        </div>
      </section>
    </div>
    ${upcomingAgenda()}
    <section class="band" id="alur" tabindex="-1">
      <div class="wrap">
        <h2>Dari suara menjadi tindakan.</h2>
        <div class="steps">
          <div class="step">
            <small>01</small>
            <h3>Kirim laporan</h3>
            <p>Pilih jenis laporan dan ceritakan persoalannya.</p>
          </div>
          <div class="step">
            <small>02</small>
            <h3>Laporan diperiksa</h3>
            <p>Admin menentukan penanganan langsung atau Forum Advokasi bersama pihak fakultas.</p>
          </div>
          <div class="step">
            <small>03</small>
            <h3>Pantau kabarnya</h3>
            <p>Buka riwayat untuk membaca status dan tanggapan.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="wrap about" id="tentang" tabindex="-1">
      <div>
        <h2>Tentang Suara Teknik</h2>
      </div>
      <p>
        Suara Teknik merupakan wadah aspirasi dan pengaduan mahasiswa Fakultas
        Teknik Universitas Jenderal Soedirman. Melalui platform ini, mahasiswa
        dapat menyampaikan aspirasi, memantau perkembangan laporan, serta
        memperoleh informasi tindak lanjut melalui penanganan langsung
        maupun Forum Advokasi.
      </p>
    </section>`;
}

function screen(title, description, body, settings = {}) {
  const { back, action = '', narrow = false, variant = '' } = settings;
  const backLink = back
    ? `<a class="back" href="#${back[0]}">← ${back[1]}</a>`
    : '';
  return `
    <section class="wrap screen ${variant}">
      <div class="${narrow ? 'narrow' : ''}">
        <header class="screen-head ${action ? 'flex' : ''}">
          <div>
            ${backLink}
            <h1>${title}</h1>
            ${description ? `<p class="intro">${description}</p>` : ''}
          </div>
          ${action}
        </header>
        ${body}
      </div>
    </section>`;
}

function auth(register) {
  if (register && !registrationOpen) {
    return screen(
      'Pendaftaran mandiri ditutup',
      'Hubungi pengelola Suara Teknik untuk mendapat akun mahasiswa.',
      button('masuk', 'Masuk', 'primary'),
      { narrow: true, back: ['beranda', 'Beranda'] }
    );
  }
  const title = register ? 'Daftar akun' : 'Masuk ke Suara Teknik';
  const description = register
    ? 'Buat akun untuk menyampaikan aspirasi dan pengaduan.'
    : 'Mahasiswa masuk dengan NIM. Admin dan akun lama tanpa NIM masuk dengan email.';
  const nextPage = (register ? 'masuk' : 'daftar') + (pendingType ? '/' + pendingType : '');
  const accountFields = register ? `
    <div class="form-grid">
      <label>Nama
        <input name="name" required maxlength="100" placeholder="Nama lengkap">
      </label>
      <label>NIM
        <input name="nim" required maxlength="30" placeholder="NIM mahasiswa">
      </label>
    </div>` : '';
  return screen(title, description, `
    <div class="panel">
      <form id="auth-form">
        ${accountFields}
        ${register ? `<label>Email
          <input name="email" type="email" required maxlength="100" autocomplete="email">
        </label>` : `<label>NIM atau email
          <input name="identifier" required maxlength="100" autocomplete="username">
        </label>`}
        <label>Kata sandi
          <input name="password" type="password" required
            minlength="${passwordMinimum}" placeholder="Minimal ${passwordMinimum} karakter">
        </label>
        <p id="auth-error" class="alert" role="alert" hidden></p>
        <div class="actions">
          <button class="btn primary">${register ? 'Buat akun' : 'Masuk'} ${icon.arrow}</button>
          ${register || registrationOpen ? `
            <a class="text-link" href="#${nextPage}">
              ${register ? 'Sudah punya akun?' : 'Daftar akun'}
            </a>` : ''}
        </div>
      </form>
    </div>`, { narrow: true, back: ['beranda', 'Beranda'] });
}

function badge(status) {
  return `<span class="badge" data-status="${escapeHTML(status)}">${escapeHTML(status)}</span>`;
}

function options(values, selected = '') {
  return values.map(value =>
    `<option ${value === selected ? 'selected' : ''}>${escapeHTML(value)}</option>`
  ).join('');
}

function visibleReports() {
  return reports.filter(report =>
    user.role === 'admin' || report.owner === user.id
  ).slice().reverse();
}

function listing(data) {
  if (!data.length) return '<p class="empty">Belum ada laporan yang cocok.</p>';
  const rows = data.map(report => `
    <li>
      <a href="#laporan/${report.id}">
        <div>
          <strong>${escapeHTML(report.title)}</strong>
          <small class="muted">${report.id} · ${report.type} · ${report.date}</small><small class="muted method-line">${methodLabel(report.method)}${report.forumPeriod ? ' · Forum ' + escapeHTML(report.forumPeriod) : ''}</small>
        </div>
        ${badge(report.status)}
        ${icon.arrow}
      </a>
    </li>`).join('');
  return `<ul class="report-list">${rows}</ul>`;
}

function dashboard() {
  const admin = user.role === 'admin';
  const data = visibleReports();
  const counts = [
    ['Total laporan', data.length],
    ...statuses.map(status => [
      status, data.filter(report => report.status === status).length,
    ]),
  ];
  const summary = counts.map(([label, count]) => `
    <div class="stat">
      <strong>${count}</strong>
      <span>${label}</span>
    </div>`).join('');
  const title = admin ? 'Dashboard admin' : `Halo, ${escapeHTML(user.name)}.`;
  const description = admin
    ? 'Ringkasan laporan yang masuk dari mahasiswa.'
    : 'Lihat ringkasan aspirasi dan pengaduanmu.';
  const action = admin
    ? button('kelola', 'Kelola laporan', 'primary', true)
    : button('buat', 'Buat laporan', 'primary', true);

  return screen(title, description, `
    <div class="stats">${summary}</div>
    <section class="panel forum-info"><h2>Forum Advokasi</h2><p>Forum bersama pihak fakultas dilaksanakan dua kali dalam satu tahun. Periode dan informasi jadwal laporannya dapat dilihat pada tanggapan admin.</p>${admin ? button('forum','Lihat laporan forum','quiet') : button('riwayat','Pantau aspirasi saya','quiet')}</section>
    <section class="report-panel" aria-label="Laporan terbaru">
      <div class="section-head">
        <h2>Laporan terbaru</h2>
        <a class="text-link" href="#${admin ? 'kelola' : 'riwayat'}">
          Lihat semua ${icon.arrow}
        </a>
      </div>
      ${listing(data.slice(0, 3))}
    </section>`, { variant: admin ? 'dashboard admin' : 'dashboard', action });
}

function reportHistory(admin, kind = '', forumOnly = false) {
  const title = forumOnly ? 'Laporan Forum Advokasi' : admin ? 'Manajemen laporan' : 'Riwayat laporan';
  const description = admin
    ? 'Cari laporan atau saring berdasarkan kategori dan status.'
    : 'Buka laporan untuk melihat perkembangan dan tanggapan admin.';
  const data = visibleReports().filter(report => (!kind || report.type.toLowerCase() === kind) && (!forumOnly || report.method === 'forum'));

  return screen(title, description, `
    <div class="filters">
      <label>Cari laporan
        <input id="search" type="search" placeholder="Judul atau nomor laporan">
      </label>
      <label>Kategori
        <select id="filter-category">
          <option value="">Semua kategori</option>
          ${options(categories)}
        </select>
      </label>
      <label>Status
        <select id="filter-status">
          <option value="">Semua status</option>
          ${options(forumOnly ? [5, 6, 2, 3, 4].map(index => statuses[index]) : statuses)}
        </select>
      </label>
    </div>
    <div class="filters extra-filters">
      ${forumOnly ? `<label>Periode forum
        <select id="filter-period">
          <option value="">Semua periode</option>
          ${options([...new Set(data.map(report => report.forumPeriod).filter(Boolean))].sort())}
        </select>
      </label>` : `<label>Metode penyelesaian
        <select id="filter-method">
          <option value="">Semua metode</option>
          <option value="direct">Penanganan langsung</option>
          <option value="forum">Forum Advokasi</option>
          <option value="pending">Belum ditentukan</option>
        </select>
      </label>`}
    </div>
    <div id="results" class="report-panel" aria-live="polite">${listing(data)}</div>`,
    { action: admin ? '' : button('buat', 'Buat laporan', 'primary', true) });
}

function reportForm(report, type = '') {
  const entry = report || {};
  const types = ['Aspirasi', 'Pengaduan'];
  const selected = entry.type || types.find(value => value.toLowerCase() === type);
  const title = report ? 'Ubah laporan' : 'Buat laporan';
  const back = report ? ['laporan/' + report.id, 'Detail laporan'] : ['dashboard', 'Dashboard'];
  const photo = entry.photo ? `src="${entry.photo}"` : 'hidden';

  return screen(title, 'Isi bagian yang wajib dan tambahkan foto kalau ada.', `
    <div class="panel">
      <form id="report-form">
        <div class="form-grid">
          <label>Jenis laporan
            <select name="type" required>
              <option value="">Pilih jenis</option>
              ${options(types, selected)}
            </select>
          </label>
          <label>Kategori
            <select name="category" required>
              <option value="">Pilih kategori</option>
              ${options(categories, entry.category)}
            </select>
          </label>
        </div>
        <label>Judul
          <input name="title" required maxlength="150"
            value="${escapeHTML(entry.title)}" placeholder="Ringkas isi laporanmu">
        </label>
        <label>Lokasi
          <input name="location" required maxlength="150"
            value="${escapeHTML(entry.location)}" placeholder="Misalnya: Ruang B.204">
        </label>
        <label>Deskripsi
          <textarea name="description" required maxlength="2000"
            placeholder="Ceritakan apa yang terjadi atau apa yang kamu usulkan."
          >${escapeHTML(entry.description)}</textarea>
        </label>
        <label>Foto bukti (opsional)
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp">
        </label>
        <p class="note">JPG, PNG, atau WebP hingga 3 MB.</p>
        <img id="photo-preview" class="preview-img" alt="Pratinjau foto bukti" ${photo}>
        <p id="report-error" class="alert" role="alert" hidden></p>
        <div class="actions">
          <button class="btn primary">
            ${report ? 'Simpan perubahan' : 'Kirim laporan'} ${icon.arrow}
          </button>
          ${button(back[0], 'Batal', 'quiet')}
        </div>
      </form>
    </div>`, { narrow: true, back });
}

function methodLabel(method) {
  return method === 'forum' ? 'Forum Advokasi' : method === 'direct' ? 'Penanganan langsung' : 'Belum ditentukan';
}
function followUpOptions(method, current) {
  const [pending, verified, processing, done, rejected, queued, discussed] = statuses;
  const flows = {
    direct: {
      [pending]: [verified, done, rejected],
      [verified]: [processing, done, rejected],
      [processing]: [done, rejected],
    },
    forum: {
      [pending]: [queued, rejected],
      [queued]: [discussed, rejected],
      [discussed]: [processing, done, rejected],
      [processing]: [done, rejected],
    },
  };
  const next = flows[method]?.[current] || [];
  if (!method || current === pending) {
    return '<option value="">Pilih status</option>' + options(next);
  }
  return options([current, ...next], current);
}

function followUpForm(report) {
  const { method, status, forumPeriod, forumResult } = report;
  const showForum = method === 'forum';
  const year = new Date().getFullYear();
  const knownPeriods = [year - 1, year, year + 1].flatMap(y => ['I - ' + y, 'II - ' + y]);
  const periods = [...new Set([forumPeriod, ...knownPeriods].filter(Boolean))];
  return `<form id="admin-form">
      <h2>Tindak lanjut</h2>
      <label>Metode penyelesaian
        <select name="method" ${method ? 'disabled' : 'required'}>
          <option value="">Pilih metode</option>
          <option value="direct" ${method === 'direct' ? 'selected' : ''}>Penanganan langsung</option>
          <option value="forum" ${showForum ? 'selected' : ''}>Forum Advokasi</option>
        </select>
      </label>
      <div id="forum-period" ${showForum ? '' : 'hidden'}>
        <label>Periode Forum Advokasi (opsional)
          <select name="forumPeriod">
            <option value="">Belum ditentukan</option>
            ${options(periods, forumPeriod)}
          </select>
        </label>
      </div>
      <label>Status
        <select name="status" required ${method ? '' : 'disabled'}>
          ${followUpOptions(method, status)}
        </select>
      </label>
      <label>Tanggapan admin
        <textarea name="response" maxlength="2000"
          placeholder="Tulis pembaruan, informasi jadwal untuk pelapor, atau alasan penolakan."></textarea>
      </label>
      <div id="forum-result" ${showForum ? '' : 'hidden'}>
        <label>Hasil pembahasan Forum Advokasi
          <textarea name="forumResult" maxlength="2000"
            placeholder="Jawaban atau keputusan pihak fakultas.">${escapeHTML(forumResult)}</textarea>
        </label>
      </div>
      <p class="note">Penjelasan wajib diisi saat langsung menyelesaikan atau menolak laporan.</p>
      <p id="admin-error" class="alert" role="alert" hidden></p>
      <button class="btn primary">Simpan tindak lanjut ${icon.arrow}</button>
    </form>`;
}

function detail(report) {
  const admin = user.role === 'admin';
  const editable = !admin && report.status === statuses[0];
  const back = admin ? ['kelola', 'Manajemen laporan'] : ['riwayat', 'Riwayat laporan'];
  const summary = `${report.id} · ${report.type} · ${report.date}`;
  const evidence = report.photo
    ? `<img src="${report.photo}" class="evidence" alt="Foto bukti laporan">`
    : '';
  const editActions = editable ? `
    <div class="actions">
      ${button('edit/' + report.id, 'Ubah laporan', 'quiet')}
      <button type="button" class="text-link danger" id="delete-report">Hapus laporan</button>
    </div>` : '';
  const timeline = report.timeline.map(entry => `
    <li>
      <strong>${escapeHTML(entry.status)}</strong><br>
      <small class="muted">${escapeHTML(entry.date)}${admin && entry.actor
        ? ' · ' + escapeHTML(entry.actor) : ''}</small>
      ${entry.note ? `<p class="detail-copy">${escapeHTML(entry.note)}</p>` : ''}
    </li>`).join('');
  const responses = report.responses.map(response => `
    <div>
      <p class="detail-copy">${escapeHTML(response.text)}</p>
      <small class="muted">${response.date}</small>
    </div>`).join('');

  return screen(escapeHTML(report.title), summary, `
    <div class="detail-grid">
      <div class="panel">
        ${badge(report.status)}
        <h2>Isi laporan</h2>
        <p>
          <strong>${escapeHTML(report.category)}</strong><br>
          <span class="note">${escapeHTML(report.location)}</span>
        </p>
        <p class="detail-copy">${escapeHTML(report.description)}</p>
        ${evidence}
        ${editActions}
        <p class="method-info"><strong>Metode penyelesaian</strong><br>${methodLabel(report.method)}${report.forumPeriod ? ' · Forum ' + escapeHTML(report.forumPeriod) : ''}</p>
        ${admin ? followUpForm(report) : ''}
      </div>
      <div class="panel">
        <h2>Perkembangan</h2>
        <ol class="timeline">${timeline}</ol>
        <h2>Tanggapan admin</h2>
        ${responses || '<p class="note">Belum ada tanggapan.</p>'}
        ${report.method === 'forum' ? `<h2>Hasil Forum Advokasi</h2><p class="detail-copy">${report.forumResult ? escapeHTML(report.forumResult) : 'Belum ada hasil pembahasan. Informasi diperbarui setelah forum dilaksanakan.'}</p>` : ''}
      </div>
    </div>`, { back });
}
