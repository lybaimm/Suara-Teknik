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
| 13 | Agenda publik | Lihat tanggal, jam WIB, gedung, ruang, dan topik Forum Advokasi dari beranda. |
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

1. Ekstrak ZIP. Salin folder `Suara_Teknik` ke `C:\xampp\htdocs`.
2. Nyalakan **Apache** dan **MySQL** dari XAMPP Control Panel.
3. Buka `http://localhost/phpmyadmin`, pilih **Import**, lalu pilih
   `Suara_Teknik/database/suara_teknik.sql` dan jalankan impor. SQL akan
   membuat database `suara_teknik` beserta tabel aplikasi.
4. Buka `http://localhost/Suara_Teknik/` melalui browser.
5. Pilih **Daftar akun** untuk membuat akun mahasiswa, lalu masuk dengan NIM dan kata sandi. Siapkan akun admin mengikuti langkah di bawah.

Konfigurasi bawaan mengikuti XAMPP lokal dengan host `127.0.0.1`, port
`3306`, pengguna `root`, dan kata sandi kosong. Jika konfigurasimu
berbeda, gunakan variabel lingkungan `SUARA_DB_HOST`, `SUARA_DB_PORT`,
`SUARA_DB_NAME`, `SUARA_DB_USER`, dan `SUARA_DB_PASSWORD`, atau ubah
nilai lokal di `api/config.php`. Untuk melihat tampilan sekaligus
menjalankan API, akses alamat localhost di atas.

Jika memakai PHP CLI dan MySQL yang sudah berjalan, jalankan
perintah berikut dari folder `Suara_Teknik` dan buka
`http://127.0.0.1:8000/`.

```sh
php scripts/import-database.php
php -S 127.0.0.1:8000 router.php
```

### Menyiapkan akun admin

Daftarkan akun yang akan dipakai admin melalui formulir biasa. Di phpMyAdmin,
pilih database `suara_teknik`, buka tab **SQL**, lalu jalankan perintah berikut
dengan email akun yang tadi didaftarkan. Setelah itu, admin masuk dengan email
dan kata sandi akun tersebut. Mahasiswa masuk dengan NIM.

```sql
UPDATE users SET role = 'admin' WHERE email = 'email-admin@example.test';
```

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

## Memperbarui instalasi lama

1. Ekspor database `suara_teknik` melalui phpMyAdmin sebagai cadangan.
2. Ganti folder aplikasi di `htdocs` dengan folder `Suara_Teknik` dari ZIP.
3. Jika database berasal dari versi sebelum fitur Agenda, impor
   `database/suara_teknik.sql` di phpMyAdmin. File ini juga menyiapkan tabel
   agenda dan kolom audit status sambil mempertahankan akun dan laporan.
   Jika sudah memakai versi Forum Advokasi, lewati impor.
4. Buka `http://localhost/Suara_Teknik/` dan tekan Ctrl+F5.

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
- Semua mahasiswa dapat melihat agenda dan datang langsung ke Forum
  Advokasi tanpa pendaftaran. Isi laporan pribadi disampaikan melalui
  **Tanggapan admin** pada detail laporan.

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

## Checklist pengujian manual

Lihat `PENGUJIAN.md` untuk skenario dan hasil yang diharapkan. Jalankan pengujian di XAMPP sebelum presentasi; hasil aktual perlu diisi oleh tim. Buku panduan mensyaratkan minimal sembilan modul yang berfungsi dan terintegrasi, tema SDGs, README repo publik, video minimal tujuh menit dan tiga unggahan showcase publik. Pembagian tugas tiga anggota serta tautan video/showcase/repository harus dilengkapi tim; tidak dibuat secara otomatis oleh paket kode ini.
