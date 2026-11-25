# Suara Teknik

Suara Teknik adalah aplikasi web untuk mengelola aspirasi dan pengaduan mahasiswa Fakultas Teknik Universitas Jenderal Soedirman. Proyek
ini disusun untuk Responsi 2 Praktikum Pemrograman Web I.

## Latar belakang dan tujuan

Aspirasi dan pengaduan tentang fasilitas, perkuliahan, dan layanan fakultas
sering disampaikan melalui media yang berbeda. Akibatnya, mahasiswa sulit
mengetahui apakah laporannya sudah diterima atau sedang ditangani. Suara
Teknik memusatkan pengiriman, pemantauan status, dan tanggapan admin.
Mahasiswa dapat mengikuti tindak lanjut laporannya dan menemukan jadwal
forum terbuka. Admin dapat mengelompokkan laporan yang perlu dibahas
bersama fakultas.

Proyek ini mengangkat **SDG 16 — Perdamaian, Keadilan, dan Kelembagaan yang
Tangguh**. Alurnya memberi mahasiswa ruang untuk berpartisipasi dan
menampilkan riwayat tindak lanjut agar prosesnya mudah dipantau.

## Modul aplikasi

| No. | Modul | Alur yang dapat dicoba |
| --- | --- | --- |
| 1 | Registrasi mahasiswa | Daftar dengan nama, NIM unik, email, dan kata sandi. |
| 2 | Masuk dan keluar | Mahasiswa masuk dengan NIM dan kata sandi. Admin dan akun lama tanpa NIM memakai email. |
| 3 | Dashboard mahasiswa | Lihat jumlah, status, dan laporan terbaru milik mahasiswa. |
| 4 | Pengiriman laporan | Kirim aspirasi atau pengaduan dengan foto opsional. |
| 5 | Riwayat laporan | Buka laporan sendiri dan ubah atau hapus laporan sebelum verifikasi. |
| 6 | Detail laporan | Baca nomor, isi, lokasi, kategori, dan foto laporan. |
| 7 | Pelacakan status | Baca perubahan status terbaru di bagian teratas. |
| 8 | Dashboard admin | Lihat ringkasan seluruh laporan yang masuk. |
| 9 | Manajemen laporan | Cari dan filter laporan lalu perbarui statusnya. |
| 10 | Tanggapan admin | Kirim pembaruan privat kepada pelapor. |
| 11 | Laporan Forum Advokasi | Tentukan jalur laporan, pilih periode, lalu catat hasil pembahasan fakultas. |
| 12 | Notifikasi dalam website | Lihat notifikasi laporan dan tandai sudah dibaca. |
| 13 | Kalender agenda publik | Kalender dengan blok warna status dan ringkasan forum per bulan. Daftar dibagi per halaman agar sejajar kalender; Lihat detail membuka jadwal, tempat, dan topik lengkap. |
| 14 | Kelola Agenda | Admin menambah draf, menerbitkan, mengubah, membatalkan, dan menghapus agenda. |

## Teknologi dan struktur

Antarmuka memakai HTML, CSS, dan JavaScript. PHP 8.0+ dengan ekstensi
`pdo_mysql` dan `mbstring` menjalankan API serta sesi login. MySQL atau
MariaDB menyimpan akun, laporan, foto, riwayat status, tanggapan admin, dan agenda.
Kata sandi disimpan sebagai hash.

| Berkas | Isi |
| --- | --- |
| `index.html` | Kerangka halaman. |
| `css/style.css` | Tata letak, palet, dan transisi. |
| `js/data.js` | Daftar kategori dan status. |
| `js/tampilan.js` | Tampilan setiap halaman. |
| `js/app.js` dan `js/api.js` | Navigasi, formulir, dan permintaan ke API. |
| `api/index.php` | Sesi, registrasi, login, dan endpoint aplikasi. |
| `api/config.php` | Koneksi PDO ke database. |
| `js/agenda.js` dan `api/agenda.php` | Agenda publik dan pengelolaan agenda admin. |
| `api/laporan.php` | Query laporan, foto, status, dan tanggapan. |
| `database/suara_teknik.sql` | Skema database untuk instalasi baru. |
| `assets/` | Foto gedung Fakultas Teknik dan font. |

## Instalasi di XAMPP

1. Ekstrak ZIP. Salin folder `Suara-Teknik-main` ke `C:\xampp\htdocs`.
2. Nyalakan **Apache** dan **MySQL** dari XAMPP Control Panel.
3. Buka `http://localhost/phpmyadmin`, pilih **Import**, lalu pilih
   `Suara-Teknik-main/database/suara_teknik.sql` dan jalankan impor. SQL akan
   membuat database `suara_teknik` beserta tabel aplikasi.
4. Buka `http://localhost/Suara-Teknik-main/` melalui browser.
5. Pilih **Daftar akun** untuk membuat akun mahasiswa, lalu masuk dengan NIM dan kata sandi. Siapkan akun admin mengikuti langkah di bawah.

Konfigurasi bawaan mengikuti XAMPP lokal dengan host `127.0.0.1`, port
`3306`, pengguna `root`, dan kata sandi kosong. Jika konfigurasimu
berbeda, gunakan variabel lingkungan `SUARA_DB_HOST`, `SUARA_DB_PORT`,
`SUARA_DB_NAME`, `SUARA_DB_USER`, dan `SUARA_DB_PASSWORD`, atau ubah
nilai lokal di `api/config.php`. Untuk melihat tampilan sekaligus
menjalankan API, akses alamat localhost di atas.

Jika memakai PHP CLI dan MySQL yang sudah berjalan, jalankan
perintah berikut dari folder `Suara-Teknik-main` dan buka
`http://127.0.0.1:8000/`.

```sh
php scripts/import-database.php
php -S 127.0.0.1:8000 router.php
```

### Menyiapkan akun admin di XAMPP

Daftarkan akun lewat web dengan email yang akan dipakai. Di phpMyAdmin,
pilih database `suara_teknik`, buka tab **SQL**, lalu jalankan perintah ini
setelah mengganti alamat emailnya dengan email akun tadi.

```sql
UPDATE users SET role = 'admin' WHERE email = 'email-admin@example.test';
```

Admin masuk dengan email. Mahasiswa masuk dengan NIM. Untuk menguji
aturan produksi dari lokal, ikuti bagian Deploy ke server publik.

## Alur presentasi

1. Sebagai mahasiswa, buat laporan lalu periksa status awalnya di detail.
2. Pilih **Keluar**, masuk sebagai admin, dan cari laporan tadi.
3. Perbarui status laporan dan isi tanggapan.
4. Masuk kembali sebagai mahasiswa untuk melihat status dan tanggapan.

Akun, laporan, status, dan tanggapan tersimpan di MySQL. Data tetap ada
setelah halaman dimuat ulang, akun keluar, atau server dimulai ulang.

## Pengumpulan Responsi 2

Sesuai Buku Panduan Responsi 2, unggah isi folder ini ke repository GitHub
publik dengan `README.md` di bagian utama. Pengumpulan akhir menggunakan
tautan repository, tautan video YouTube, dan tautan unggahan Project Showcase.
Video presentasi berdurasi minimal 7 menit dengan partisipasi seluruh
anggota. Setiap anggota mengunggah Showcase secara publik melalui Instagram
atau LinkedIn.

## Berkas yang diunggah ke GitHub

Unggah source code, termasuk `.gitignore`, `.htaccess`, dan satu skema
`database/suara_teknik.sql`. Skema ini dapat diimpor untuk membuat tabel
dan tidak berisi akun. Buat akun admin dengan email dan kata sandi
masing-masing di database tujuan setelah impor (lihat bagian Deploy).

Simpan dump database, data NIM, laporan mahasiswa, foto bukti, file
`.env`, dan kredensial di luar repo. Jangan mengganti skema di atas
dengan hasil ekspor phpMyAdmin. Cek perubahan yang disiapkan untuk commit
sebelum push. Jika kredensial sudah terlanjur dipublikasikan, ganti
kredensial itu, lalu tangani riwayat commit bila diperlukan.

GitHub menyimpan source. Jalankan PHP dan database di hosting yang
mendukung PHP dan MySQL atau MariaDB.

## Memperbarui instalasi lama

1. Ekspor database `suara_teknik` melalui phpMyAdmin sebagai cadangan.
2. Ganti folder aplikasi di `htdocs` dengan folder `Suara-Teknik-main` dari ZIP.
3. Jika database berasal dari versi sebelum fitur Agenda, impor
   `database/suara_teknik.sql` di phpMyAdmin. File ini juga menyiapkan tabel
   agenda dan kolom audit status sambil mempertahankan akun dan laporan.
   Untuk pembaruan paket hosting ini, impor juga SQL agar tabel
   `login_limits` tersedia, termasuk bila fitur Forum Advokasi sudah ada.
4. Buka `http://localhost/Suara-Teknik-main/` dan tekan Ctrl+F5.

Untuk instalasi kosong, gunakan `database/suara_teknik.sql`.
Jika memakai konfigurasi khusus pada instalasi lama, terapkan kembali
koneksi database di `api/config.php` atau melalui variabel lingkungan.

## Alur laporan dan agenda

- Admin memilih **Penanganan langsung** atau **Forum Advokasi**. Laporan
  sederhana dapat langsung selesai dari status awal dengan penjelasan.
  Laporan forum masuk **Menunggu Forum Advokasi**, lalu **Telah Dibahas**
  setelah admin mencatat hasilnya. Setelah itu admin dapat meneruskan
  penanganan atau menutup laporan.
- Pelapor melihat tanggapan privat, termasuk jadwal yang terkait dengan
  laporannya. Perkembangan tampil dari yang terbaru. Admin dapat melihat
  nama pencatat untuk perubahan status baru.
- Admin membuka **Kelola Agenda** lalu **Tambah agenda**. Isi judul,
  tanggal, jam WIB, gedung, ruang dan pokok bahasan publik.
  Agenda baru menggunakan status **Draf**. Pilih **Terbit** untuk
  menampilkannya di beranda. Agenda mendatang yang dibatalkan diberi
  label **Dibatalkan**. Forum yang sudah lewat tetap dapat dikelola admin.
  Agenda nonforum dari versi sebelumnya tetap tersimpan di database.
  Kalender bulanan juga menampilkan riwayat agenda yang pernah diterbitkan
  atau dibatalkan. Draf tetap hanya dapat dilihat admin. Kategori waktu
  mengikuti jadwal WIB dan diperbarui setiap menit; tanpa jam selesai,
  kegiatan dianggap berlangsung sampai akhir tanggal tersebut.
- Semua mahasiswa dapat melihat agenda dan datang langsung ke Forum
  Advokasi tanpa pendaftaran. Isi laporan pribadi disampaikan melalui
  **Tanggapan admin** pada detail laporan.

### Notifikasi laporan

Mahasiswa bisa membuka lonceng untuk melihat perubahan status, tanggapan,
dan penyelesaian laporannya. Admin menerima notifikasi saat laporan masuk,
diperbarui, atau dihapus oleh pelapor. Daftar diperbarui saat dibuka dan
dicek otomatis setiap 15 detik selama tab aktif.

## Deploy ke server publik

1. Gunakan PHP yang masih didukung (disarankan 8.4+) dengan `pdo_mysql` dan `mbstring`, serta MySQL
   atau MariaDB. Aktifkan HTTPS dan pengalihan HTTP ke HTTPS.
2. Impor `database/suara_teknik.sql` dengan pengguna database yang berwenang
   membuat atau memperbarui tabel. File ini hanya memuat skema dan migrasi.
   Gunakan nama database `suara_teknik`, atau sesuaikan perintah
   `CREATE DATABASE` dan `USE` dengan nama dari hosting. Jika memperbarui
   database lama, ekspor cadangan lalu impor SQL ke database tersebut
   untuk menambah tabel `login_limits`.
3. Atur variabel lingkungan berikut untuk PHP web dan CLI.

   | Variabel | Nilai |
   | --- | --- |
   | `SUARA_ENV` | `production` |
   | `SUARA_DB_HOST` | Host database dari hosting |
   | `SUARA_DB_PORT` | Port database, biasanya `3306` |
   | `SUARA_DB_NAME` | Nama database yang diimpor |
   | `SUARA_DB_USER` | Pengguna khusus aplikasi, bukan `root` |
   | `SUARA_DB_PASSWORD` | Kata sandi unik pengguna database |

   Akun database aplikasi memerlukan hak `SELECT`, `INSERT`, `UPDATE`,
   serta `DELETE` pada database aplikasi. Jika HTTPS berhenti pada proxy
   tepercaya, atur web server agar PHP mengenali HTTPS. Sebagai pilihan
   konfigurasi, set `SUARA_TLS_TERMINATED=1` dari sisi server hanya jika
   origin tidak dapat diakses langsung dari publik dan proxy sudah
   mengalihkan HTTP ke HTTPS. Teruskan IP pengunjung melalui pengaturan
   proxy/web server yang tepercaya supaya batas per IP berfungsi.
4. Gunakan aturan `.htaccess` yang disertakan bila menjalankan Apache
   dengan override yang mendukungnya. Di Nginx atau hosting yang
   mengabaikan `.htaccess`, blokir akses HTTP ke direktori `database/`,
   `private/`, `scripts/` dan file konfigurasi tersembunyi di server.
   Sebelum membuka akses publik, uji dari browser bahwa file SQL
   dan skrip CLI mendapat status 403 atau 404.
5. Buat tiga akun admin dengan kata sandi baru dan berbeda. Contoh ini
   dijalankan di terminal Bash hosting dari folder proyek. Ketik kata
   sandi baru pada tiap perintah `read`. Ganti alamat email contoh dengan
   email asli setiap admin. Input kata sandi tidak terlihat di layar.

   ```bash
   read -rsp 'Kata sandi Baim: ' suara_password; echo
   printf '%s\n' "$suara_password" | php scripts/set-account.php admin Baim baim@example.test
   unset suara_password

   read -rsp 'Kata sandi Nova: ' suara_password; echo
   printf '%s\n' "$suara_password" | php scripts/set-account.php admin Nova nova@example.test
   unset suara_password

   read -rsp 'Kata sandi Meydina: ' suara_password; echo
   printf '%s\n' "$suara_password" | php scripts/set-account.php admin Meydina meydina@example.test
   unset suara_password
   ```

   Skrip memerlukan minimal 15 karakter dan maksimal 72 byte. Jika
   emailnya sudah ada, skrip mengganti kredensial sambil menjaga ID akun.
   Jika mengimpor database pengujian lama, nonaktifkan akun uji termasuk
   admin demo atau ganti kredensial seluruh akun yang akan dipertahankan
   sebelum web dibuka untuk publik.
6. Pendaftaran mandiri tertutup di produksi. Pengelola dapat memverifikasi
   NIM lewat sumber resmi kampus, lalu membuat akun mahasiswa dengan
   `scripts/set-account.php mahasiswa NAMA EMAIL NIM` dan kata sandi baru
   melalui stdin seperti contoh di atas. `SUARA_OPEN_REGISTRATION=1`
   mengaktifkan pendaftaran mandiri jika memang diinginkan. Mode itu
   hanya mengecek format dan keunikan data.
7. Uji login admin dan mahasiswa, visibilitas laporan serta foto,
   notifikasi lonceng, dan akses direktori privat di hosting. Pastikan
   cookie sesi bertanda `Secure` dan `HttpOnly`. Login dibatasi lima
   percobaan per akun dan 60 per IP dalam 15 menit. Sesi berakhir
   maksimal delapan jam setelah login.

Paket gabungan ini juga mempertahankan validasi input/ID yang ketat,
pembatasan registrasi 20 percobaan per IP per jam, CSP, pemblokiran
`.runtime`, metadata Git dan berkas cadangan, serta perbaikan router Windows.
Simpan sesi dan `SUARA_RATE_LIMIT_DIR` (counter registrasi) di direktori privat
yang dapat ditulis PHP. Limiter login memakai tabel `login_limits`; semua
worker perlu menggunakan database yang sama. Untuk beberapa server aplikasi,
counter registrasi berbasis file juga memerlukan penyimpanan bersama.

Lihat [SECURITY-REVIEW.md](SECURITY-REVIEW.md) untuk hasil pengujian,
cara mengulangnya, dan batas yang perlu diperiksa di hosting.

## Checklist pengujian manual

Lihat `PENGUJIAN.md` untuk skenario dan hasil yang diharapkan. Jalankan pengujian di XAMPP sebelum presentasi; hasil aktual perlu diisi oleh tim. Buku panduan mensyaratkan minimal sembilan modul yang berfungsi dan terintegrasi, tema SDGs, README repo publik, video minimal tujuh menit dan tiga unggahan showcase publik. Pembagian tugas tiga anggota serta tautan video/showcase/repository harus dilengkapi tim; tidak dibuat secara otomatis oleh paket kode ini.
