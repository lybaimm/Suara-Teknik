# Pemeriksaan lokal — 25 November 2026

Perubahan diuji pada database terpisah berawalan `suara_teknik_security_`.
Database aplikasi/presentasi dan akun lama tidak dihapus atau diubah.
Hasil ini menilai skenario yang disebutkan di bawah, bukan jaminan terhadap
seluruh ancaman atau pengganti pengujian pada hosting tujuan.

## Temuan dan perbaikan

| Temuan | Perubahan |
| --- | --- |
| Instalasi SQL membuat admin dengan kredensial latihan yang diketahui | Satu skema SQL tanpa akun bawaan. Akun dibuat melalui `scripts/set-account.php` dengan password baru melalui stdin; skrip mensyaratkan minimal 15 karakter. |
| Percobaan login tidak dibatasi | Batas 5 percobaan per akun dan 60 per IP dalam 15 menit, disimpan pada `login_limits`; registrasi dibatasi 20 percobaan per IP per jam dengan counter file terkunci. HTTP 429 menyertakan Retry-After. Batas tidak bergantung cookie klien. |
| Direktori runtime dapat diakses melalui Apache | Aturan root memblokir direktori internal, metadata Git dan berkas konfigurasi/cadangan; directory listing dimatikan. |
| `DATABASE/suara_teknik.sql` dapat terbuka pada router Windows | Nama direktori dibandingkan tanpa membedakan huruf besar/kecil, dan separator dinormalisasi. |
| Error PHP dapat muncul pada respons unggahan besar | Display errors dimatikan di aplikasi dan konfigurasi server; panjang request diperiksa sebelum parsing. Launcher lokal memakai direktori temporary privat. |
| Header perlindungan browser belum tersedia | CSP, frame-ancestors none, X-Frame-Options DENY, nosniff, Referrer-Policy, dan Permissions-Policy ditambahkan. |
| Beberapa tipe ID dapat dikonversi ke angka oleh PHP | ID agenda/notifikasi harus integer positif yang valid; boolean, float, array, object, null, dan nilai di luar rentang ditolak. |
| Validasi request kurang ketat | Hanya object JSON dengan Content-Type yang sesuai; action dan isian harus bertipe benar, tanpa karakter kontrol. Isian wajib yang hanya berisi karakter kosong/tak terlihat ditolak. |

Registrasi menetapkan role mahasiswa di server. Email dan NIM unik ditegakkan
oleh indeks database, termasuk variasi huruf besar/kecil dan spasi di tepi.
Nama bukan identifier unik: dua mahasiswa boleh memiliki nama yang sama.

## Skenario yang diuji

Hasil setelah penggabungan ZIP `Suara_Teknik_Siap_GitHub.zip`:
**25/25 kelompok skenario keamanan lulus**. Delapan path sensitif
yang dicoba melalui Apache ditolak (403/404); halaman utama, API dan logo
tetap dapat diakses dengan header keamanan. Pengujian tambahan lulus untuk
pembuatan/pembaruan akun CLI, penolakan password pendek dan NIM duplikat,
penolakan HTTP eksternal dan header proxy palsu, sesi kedaluwarsa delapan jam,
serta kebijakan registrasi, password, TLS tepercaya dan pengguna DB production.
Hasil JSON suite gabungan ada lokal di `.runtime/security-merged.json`.

Suite `tests/security-audit.cjs` memeriksa 25 kelompok skenario: data anonim,
kredensial admin bawaan, SQL injection login, CSRF, JSON/metode/payload besar,
duplikasi email/NIM, validasi isian, eskalasi role, pemalsuan owner/status,
akses laporan dan foto lintas akun, operasi admin oleh mahasiswa, operasi
mahasiswa oleh admin/anonim, tipe ID/action, unggahan foto, panjang isian,
validasi agenda, privasi draf, stored XSS pada browser, notifikasi lintas akun,
alur status, sesi login/logout, path privat, CSP/framing, pembatasan login,
dan pembatasan registrasi.

Browser menggunakan emulasi Chrome melalui Playwright. Foto valid diperiksa
bisa diakses pemilik, sementara akun lain ditolak. Pengujian XSS turut
memastikan elemen dengan event handler tidak terbentuk dan tidak ada
pelanggaran CSP pada alur aplikasi yang diuji.

## Mengulang uji pada database terpisah

Gunakan PHP dan MySQL lokal. Dari root proyek dalam PowerShell, pilih nama
database uji baru untuk tiap pengujian. Importer menolak database berisi tabel.

```powershell
$env:SUARA_DB_PORT = '3308' # sesuaikan dengan MySQL lokal
$env:SUARA_DB_NAME = 'suara_teknik_security_uji_baru'
php scripts/import-database.php
php tests/prepare-security-fixture.php
$env:SUARA_RATE_LIMIT_DIR = "$PWD/.runtime/limiter-uji-baru"
./start-local.ps1 -Port 8012
```

Di terminal kedua, dari root proyek:

```powershell
npm --prefix tests install
$env:SUARA_TEST_BASE = 'http://127.0.0.1:8012/'
$env:SUARA_AUDIT_PHASE = 'final'
node tests/security-audit.cjs
```

Untuk menguji tambahan kebijakan hosting/CLI pada database uji yang sama,
atur variabel database seperti pada terminal server, lalu jalankan
`node tests/hosting-controls.cjs`. Pemeriksaan sesi kedaluwarsa memerlukan
`SUARA_SECURITY_SESSION_DIR` yang menunjuk direktori sesi privat server uji.

Suite memakai Chrome pada lokasi standar Windows. Fixture admin hanya boleh
dibuat pada database bernama `suara_teknik_security_...`. Kredensial acak serta
laporan JSON ada di `.runtime`, tidak diunggah ke Git. Suite membuat akun,
laporan, agenda dan notifikasi pengujian: jangan arahkan ke database aplikasi.
Untuk mengulang, gunakan database serta direktori limiter uji baru agar
counter dari uji sebelumnya tidak mengganggu hasil.

## Batas sebelum deploy

- Akun latihan/data presentasi yang sudah ada pada database lama tetap ada.
  Jangan menyalinnya ke produksi tanpa mengganti kredensial dan membersihkan
  data tersebut. Menghapus seed dari paket tidak mengubah akun yang sudah tersimpan.
- Validasi email saat ini memeriksa format dan keunikan, bukan kepemilikan
  alamat email atau status mahasiswa. Pendaftaran mandiri ditutup secara
  bawaan di hosting; admin memverifikasi mahasiswa sebelum membuat akun CLI.
  Aplikasi belum memiliki verifikasi email/SSO, MFA, atau pemulihan kata sandi.
- Pengujian lokal bukan pengujian TLS, reverse proxy, otorisasi database,
  patch server, backup, beban terdistribusi, atau perlindungan DDoS hosting.
  Uji kembali aturan berkas privat, cookie Secure dan header di alamat HTTPS
  tujuan. Limiter file memerlukan penyimpanan bersama jika ada beberapa server.
- Runtime lokal yang dipakai adalah PHP 8.0.30. Gunakan PHP yang masih
  didukung untuk hosting; versi 8.0 sudah tidak didukung.

Acuan: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html),
[OWASP CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html),
dan [versi PHP yang didukung](https://www.php.net/supported-versions.php).
