# Suara Teknik

## Menjalankan dari GitHub

Repository ini berisi aplikasi PHP beserta database SQL. GitHub menyimpan sumber;
untuk menjalankan login dan laporan diperlukan PHP serta MySQL/MariaDB.
GitHub Pages tidak menjalankan PHP atau database aplikasi ini.

```powershell
git clone https://github.com/lybaimm/Suara-Teknik.git
cd Suara-Teknik
# Nyalakan MySQL/MariaDB terlebih dahulu.
# Hanya bila MySQL memakai port selain 3306, sesuaikan misalnya:
$env:SUARA_DB_PORT = '3308'
php scripts/import-database.php snapshot
.\start-local.ps1
```

Buka `http://127.0.0.1:8000/`. Jika `php` belum ada di PATH, gunakan
`C:\xampp\php\php.exe` untuk perintah impor. `start-local.ps1` juga mendeteksi
lokasi PHP XAMPP tersebut. Untuk port web lain: `.\start-local.ps1 -Port 8001`.
Pastikan variabel koneksi dipasang di terminal yang sama sebelum menjalankan web.
Pada komputer pengelola saat penyiapan, database memakai port **3308**.
Komputer anggota lain bisa memakai MySQL XAMPP pada port **3306**.

- `database/snapshot-lokal.sql`: salinan lengkap saat penyiapan repository,
  berisi tujuh tabel, tiga akun contoh, dan tiga laporan. Kata sandi tetap berupa
  hash; kredensial login disampaikan pengelola secara terpisah.
- `database/suara_teknik.sql`: skema dan data contoh awal. Jika memilih instalasi
  awal, jalankan `php scripts/import-database.php seed`, kemudian
  `php scripts/setup-test-accounts.php` untuk membuat kata sandi acak akun contoh.
- `database/upgrade.sql`: pembaruan untuk instalasi versi lama.

Pilih salah satu snapshot atau seed. Skrip impor menolak database yang sudah
berisi tabel agar tidak menimpa data lama. Untuk koneksi berbeda, atur
`SUARA_DB_HOST`, `SUARA_DB_PORT`, `SUARA_DB_NAME`, `SUARA_DB_USER`, dan
`SUARA_DB_PASSWORD`. Jangan commit kredensial atau data pengaduan nyata.
`git pull` memperbarui kode; perubahan data dari penggunaan aplikasi tidak otomatis
tersinkron ke GitHub atau komputer anggota lain.

Untuk PHP CLI tanpa PowerShell:

```sh
php -S 127.0.0.1:8000 router.php
```

Pastikan folder sesi PHP dapat ditulis. Launcher PowerShell menyiapkan folder sesi
di `.runtime/` yang diabaikan Git. Router mencegah file SQL, konfigurasi privat,
skrip CLI, dan metadata Git diunduh melalui server pengembangan.
Untuk Apache/XAMPP, impor salah satu SQL melalui phpMyAdmin dan buka folder
proyek melalui localhost. File `.htaccess` melindungi folder database/privat.
Composer diperlukan hanya untuk Web Push; instal dengan `composer install`.
Kunci VAPID dan dependensi `vendor/` tidak disimpan ke Git.

Suara Teknik adalah aplikasi web untuk mengelola aspirasi dan pengaduan mahasiswa Fakultas Teknik Universitas Jenderal Soedirman. Proyek
ini disusun untuk Responsi 2 Praktikum Pemrograman Web I.

## Latar belakang dan tujuan

Aspirasi dan pengaduan tentang fasilitas, perkuliahan, dan layanan fakultas
sering disampaikan melalui media yang berbeda. Akibatnya, mahasiswa sulit
mengetahui apakah laporannya sudah diterima atau sedang ditangani. Suara
Teknik memusatkan pengiriman, pemantauan status, dan tanggapan admin.

Proyek ini mengangkat **SDG 16 — Perdamaian, Keadilan, dan Kelembagaan yang
Tangguh**. Alurnya memberi mahasiswa ruang untuk berpartisipasi dan
menampilkan riwayat tindak lanjut agar prosesnya mudah dipantau.

## Modul aplikasi

| No. | Modul | Alur yang dapat dicoba |
| --- | --- | --- |
| 1 | Registrasi mahasiswa | Daftar akun mahasiswa dengan nama, NIM, email, dan kata sandi. |
| 2 | Masuk dan keluar | Masuk dengan email dan kata sandi akun terdaftar. Sesi dikelola oleh PHP. |
| 3 | Dashboard mahasiswa | Lihat jumlah, status, dan laporan terbaru milik mahasiswa. |
| 4 | Pengiriman laporan | Kirim aspirasi atau pengaduan dengan foto opsional. |
| 5 | Riwayat laporan | Buka laporan sendiri dan ubah atau hapus laporan sebelum verifikasi. |
| 6 | Detail laporan | Baca nomor, isi, lokasi, kategori, dan foto laporan. |
| 7 | Pelacakan status | Ikuti perubahan status beserta tanggalnya. |
| 8 | Dashboard admin | Lihat ringkasan seluruh laporan yang masuk. |
| 9 | Manajemen laporan | Cari dan filter laporan lalu perbarui statusnya. |
| 10 | Tanggapan admin | Berikan tanggapan yang bisa dibaca mahasiswa. |

## Teknologi dan struktur

Antarmuka memakai HTML, CSS, dan JavaScript. PHP 8.0+ dengan ekstensi
`pdo_mysql` dan `mbstring` menjalankan API serta sesi login. MySQL atau
MariaDB menyimpan akun, laporan, foto, riwayat status, dan tanggapan admin.
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
| `api/laporan.php` | Query laporan, foto, status, dan tanggapan. |
| `database/suara_teknik.sql` | Skema database dan data contoh untuk presentasi. |
| `assets/` | Foto gedung Fakultas Teknik dan font. |

## Instalasi di XAMPP

1. Ekstrak ZIP. Salin folder `Suara_Teknik` ke `C:\xampp\htdocs`.
2. Nyalakan **Apache** dan **MySQL** dari XAMPP Control Panel.
3. Buka `http://localhost/phpmyadmin`, pilih **Import**, lalu pilih
   `Suara_Teknik/database/suara_teknik.sql` dan jalankan impor. SQL akan
   membuat database `suara_teknik` beserta tabel dan data contoh.
4. Buka `http://localhost/Suara_Teknik/` melalui browser.
5. Pilih **Masuk** dan isi email serta kata sandi. Akun baru dapat dibuat melalui **Daftar akun**. Untuk akun uji coba, ikuti langkah berikut.

Konfigurasi bawaan mengikuti XAMPP lokal dengan host `127.0.0.1`, port
`3306`, pengguna `root`, dan kata sandi kosong. Jika konfigurasimu
berbeda, gunakan variabel lingkungan `SUARA_DB_HOST`, `SUARA_DB_PORT`,
`SUARA_DB_NAME`, `SUARA_DB_USER`, dan `SUARA_DB_PASSWORD`, atau ubah
nilai lokal di `api/config.php`. Untuk melihat tampilan sekaligus
menjalankan API, akses alamat localhost di atas.

Jika memakai PHP CLI dan MySQL yang sudah berjalan, impor SQL lalu jalankan
perintah berikut dari folder `Suara_Teknik` dan buka
`http://127.0.0.1:8000/`.

```sh
php -S 127.0.0.1:8000
```

### Akun uji coba privat (hanya pengelola)

Tombol dan endpoint login otomatis dinonaktifkan. Akun contoh yang sudah ada tetap dipertahankan agar riwayat laporan tidak hilang. Untuk mengaktifkan login dengan kata sandi, jalankan sekali melalui CMD (sesuaikan drive XAMPP):

```bat
cd /d D:\xampp\htdocs\Suara_Teknik
D:\xampp\php\php.exe scripts\setup-test-accounts.php
```

Skrip CLI menampilkan email dan kata sandi acak untuk akun mahasiswa dan admin contoh yang masih ada. Simpan hasilnya secara privat. Menjalankan ulang skrip mengganti kata sandi kedua akun tersebut. Skrip tidak membuat akun baru atau menghapus laporan. Jangan unggah kata sandinya ke GitHub. Jika akun contoh tidak tersedia, daftarkan akun biasa dan ubah peran akun admin melalui database sebagai pengelola.

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin-kamu@example.test';
```

## Alur demo untuk presentasi

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

## Pembaruan versi Advokasi dan Notifikasi

Versi ini mempertahankan kode lama dan desain biru-putih. PHP minimal **8.0** untuk fitur inti; PHP 8.2 atau lebih baru dianjurkan, terutama untuk Web Push. Perbaikan `array_merge` menggantikan unpack array ber-key string sehingga kompatibel dengan PHP 8.0. Tidak perlu menghapus database lama.

### Untuk pengguna yang sudah punya database (seperti instalasi lama)

1. Keluar dari akun, tutup tab website. Cadangkan folder lama dan ekspor database `suara_teknik` melalui phpMyAdmin (Export → Quick → SQL).
2. Ekstrak ZIP baru dan **ganti** folder `D:\xampp\htdocs\Suara_Teknik` (jika instalasi di D:). Jangan sampai folder bersarang `Suara_Teknik/Suara_Teknik`. Untuk instalasi baru, impor `database/suara_teknik.sql` saja.
3. Jika memakai database lama, pilih `database/upgrade.sql` di menu Import phpMyAdmin, lalu Go. Skrip ini menambahkan kolom `method`, `forum_period`, `forum_result` serta dua tabel notifikasi. Tidak menghapus laporan atau akun. Laporan lama yang sudah diverifikasi dikategorikan penanganan langsung; yang belum diverifikasi tetap belum ditentukan.
4. Pastikan Apache dan MySQL aktif, akses `http://localhost/Suara_Teknik/` dan tekan Ctrl+F5. Masuk dengan email dan kata sandi akun yang telah dibuat atau akun uji coba yang sudah dikonfigurasi.
5. Jika API menampilkan error umum, lihat log PHP/Apache (misalnya `D:\xampp\apache\logs\error.log`); jangan tampilkan exception database ke pengguna publik.

### Alur baru

- Mahasiswa membuat laporan; admin menerima notifikasi dalam website. Admin menentukan metode langsung atau forum. Mahasiswa dapat mengedit/menghapus sebelum verifikasi saja.
- Forum Advokasi terlaksana dua kali dalam satu tahun; periode I/II dan tahun dapat dipilih atau dibiarkan belum ditentukan untuk kebutuhan rekap. Bulan, tanggal dan jam hanyalah teks dalam **Tanggapan admin**, tidak ada kolom tanggal/jam forum khusus.
- Admin dapat menyimpan tanggapan baru tanpa mengganti status. Tanggapan sebelumnya tetap tercatat. Hasil forum tersedia terpisah dari tanggapan, sebagai hasil terakhir yang diperbarui oleh admin. `Telah Dibahas` tidak sama dengan `Selesai`. Untuk kedua status itu pada metode forum, isi hasil pembahasan terlebih dahulu.
- Halaman Forum Advokasi admin memfilter laporan menurut periode, kategori, status, metode dan pencarian. Mahasiswa melihat metode, status, tanggapan, dan hasil terkait laporannya sendiri melalui dashboard dan riwayat.
- Popup sukses muncul setelah API sukses membuat/mengedit/menghapus laporan atau menyimpan tindak lanjut.
- Lonceng menampilkan hingga 100 notifikasi terbaru per akun; pembaruan otomatis diperiksa setiap 15 detik saat tab aktif. Klik notifikasi untuk menandainya dibaca dan membuka laporan. Jika laporan sudah dihapus, kembali ke riwayat/manajemen laporan. Notifikasi tetap tersedia tanpa Web Push.

### Mengaktifkan Web Push (opsional, tetapi diperlukan untuk demo push browser)

Fitur inti tidak memerlukan Composer. Web Push sungguhan membutuhkan koneksi internet, izin pengguna, browser yang mendukung Push API, PHP dengan `curl`, `mbstring`, `openssl` serta ekstensi yang diminta Composer (misalnya `gmp` atau `bcmath` tergantung versi), library Minishlink, dan kunci VAPID. Jangan menonaktifkan verifikasi TLS. Localhost adalah secure context untuk tes; hosting harus HTTPS. PHP Web Push versi lama untuk PHP 8.0/8.1 tidak lagi dipelihara; untuk penggunaan publik gunakan PHP 8.2+ dan library yang masih didukung.

1. Instal Composer dari https://getcomposer.org/download/ dan arahkan ke `D:\xampp\php\php.exe`. Periksa `php -v` serta `php -m` di terminal. Aktifkan ekstensi yang kurang pada php.ini jika diminta Composer dan restart Apache.
2. Buka terminal di folder project (CMD Windows):

   ```bat
   cd /d D:\xampp\htdocs\Suara_Teknik
   composer install
   D:\xampp\php\php.exe scripts\setup-push.php email-admin@example.com
   ```

   Ganti email contoh dengan email kontak admin yang valid. Skrip menghasilkan `private/vapid.php` berisi kunci unik server. Jangan unggah file ini ke repo publik; `.gitignore` sudah mengecualikannya. Folder `vendor/` dihasilkan Composer dan tidak perlu masuk repo. Jangan mengganti kunci saat langganan masih aktif.
3. Refresh website. Login, klik **Aktifkan notifikasi** pada dialog atau melalui lonceng → Pengaturan push. Pilih Allow/Izinkan pada prompt browser.
4. Uji memakai **dua profil Chrome berbeda**, satu mahasiswa dan satu admin. Jangan logout dari akun penerima sebelum tes: logout mencabut langganan browser ini untuk menjaga privasi. Tab penerima boleh ditutup; browser/OS harus mendukung pengiriman latar belakang. Kirim laporan dari mahasiswa, lalu balas dari admin. Klik push untuk membuka laporan melalui Service Worker.
5. Jika push tidak diterima, tetap periksa lonceng, izin browser, koneksi internet, dan log PHP. Push merupakan pengiriman best-effort setelah transaksi tersimpan; kegagalan push tidak membatalkan laporan. Tidak ada retry/antrean persisten di versi praktikum ini. Push menggunakan pesan umum agar isi pengaduan tidak tampil di lock screen. Endpoint dibatasi pada layanan push browser yang dikenal; browser lain bisa tidak didukung.

## Modul versi baru (13 modul)

Sepuluh modul asli tetap ada. Tiga tambahan:

| No. | Modul | Demonstrasi |
|---|---|---|
| 11 | Pengelolaan Forum Advokasi | Tentukan metode/periode, buka agenda admin, simpan hasil fakultas. |
| 12 | Notifikasi dalam website | Laporan baru, perubahan, tanggapan, status; tandai dibaca. |
| 13 | Web Push Notification | Daftar perangkat, terima push di luar tab, buka laporan, nonaktifkan. |

Popup sukses merupakan fitur lintas modul. Integrasi: HTML/CSS sebagai antarmuka responsif, JavaScript untuk DOM, event, Fetch API dan validasi, PHP untuk autentikasi, sesi, otorisasi dan transaksi, MySQL untuk CRUD dan relasi. Modul 13 memerlukan konfigurasi tambahan di atas.

## Checklist pengujian manual

Lihat `PENGUJIAN.md` untuk skenario dan hasil yang diharapkan. Jalankan pengujian di XAMPP sebelum presentasi; hasil aktual perlu diisi oleh tim. Buku panduan mensyaratkan minimal sembilan modul yang berfungsi dan terintegrasi, tema SDGs, README repo publik, video minimal tujuh menit dan tiga unggahan showcase publik. Pembagian tugas tiga anggota serta tautan video/showcase/repository harus dilengkapi tim; tidak dibuat secara otomatis oleh paket kode ini.
