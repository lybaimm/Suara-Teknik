# Skenario pengujian Suara Teknik

## Hasil pengujian lokal 23 November 2026

Pengujian interaksi dijalankan dengan Chrome melalui Playwright, PHP 8.0.30,
dan MariaDB 10.4.32. Snapshot berhasil dipulihkan ke database pengujian terpisah;
pengujian tidak mengubah tiga laporan dalam database aktif pengelola.

Sepuluh kelompok uji lulus:

1. Tautan Beranda, Cara Kerja, Tentang, dan kembali.
2. Registrasi akun baru, login, dan logout.
3. Aspirasi beranda menuju login lalu formulir dengan jenis terpilih.
4. Dashboard, riwayat, detail, pencarian, dan filter status mahasiswa.
5. Membuat laporan dengan foto, membuka foto, mengubah, membatalkan hapus,
   menghapus laporan, serta membuat laporan tanpa foto.
6. Login admin, manajemen laporan, filter kategori dan metode.
7. Tanggapan admin, status Diverifikasi, agenda forum menurut periode,
   serta status Telah Dibahas dengan hasil forum.
8. Notifikasi mahasiswa, tandai dibaca, buka laporan, tampilkan hasil forum,
   serta dialog pengaturan push ketika konfigurasi push belum tersedia.
9. Navigasi viewport ponsel 390 x 844 tanpa overflow horizontal, logout
   kedua peran, dan pengalihan dashboard ke login setelah keluar.
10. Router PHP CLI menolak akses HTTP ke SQL, folder privat, metadata Git,
    dan skrip impor.

Tidak ada error JavaScript selama pengujian tersebut. Pemeriksaan sintaks
seluruh PHP dan JavaScript aplikasi juga lulus. Pengiriman Web Push sungguhan,
hosting publik, dan konfigurasi Apache tidak diuji dalam putaran ini.
Checklist berikut tetap menjadi panduan untuk pengujian tim yang lebih luas.

Gunakan database cadangan untuk uji pertama. Status di bawah adalah hasil yang diharapkan, bukan klaim hasil uji XAMPP.

| No | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Registrasi akun, email/NIM duplikat | Akun baru berhasil; duplikat ditolak. |
| 2 | Login dengan email dan kata sandi mahasiswa dan admin, logout | Hak akses sesuai peran; logout mengakhiri sesi. |
| 3 | Mahasiswa membuat laporan dengan/tanpa foto | Laporan tersimpan, popup sukses, detail dengan ID ST-xxx. |
| 4 | Foto bukan JPG/PNG/WebP atau >3 MB | Ditolak dengan pesan validasi. |
| 5 | Edit dan hapus laporan sebelum verifikasi | Data berubah/dihapus, popup muncul; admin mendapat notifikasi. |
| 6 | Admin menentukan langsung dan memilih Diverifikasi, Sedang Diproses, Selesai | Status baru dan riwayat tercatat; popup admin; notifikasi mahasiswa. |
| 7 | Mahasiswa mencoba edit setelah verifikasi | Aksi tidak tersedia; API menolak. |
| 8 | Admin memilih Forum Advokasi, periode II, Menunggu Forum Advokasi | Masuk agenda admin dan statistik mahasiswa; metode tampil. |
| 9 | Admin mengisi pembaruan jadwal melalui Tanggapan Admin tanpa mengubah status | Kedua tanggapan tersimpan, mahasiswa menerima notifikasi baru. |
| 10 | Admin memilih Telah Dibahas tanpa hasil | Ditolak; isi hasil untuk menyimpan. |
| 11 | Isi hasil forum, pilih Telah Dibahas lalu Selesai | Hasil terlihat mahasiswa; status dan tanggapan tersimpan. |
| 12 | Pilih Ditolak tanpa alasan | Ditolak sampai alasan diisi. |
| 13 | Filter periode/metode/status dan pencarian | Hanya laporan yang cocok ditampilkan. |
| 14 | Klik lonceng, klik notifikasi dan tandai semua dibaca | Laporan terkait dibuka, jumlah belum dibaca turun, persist setelah refresh. |
| 15 | Akun mahasiswa berbeda membuka ID laporan milik orang lain | Tidak dapat mengakses detail/API foto milik akun lain. |
| 16 | Upgrade database lama | Akun dan laporan lama tetap ada; tabel/kolom baru tersedia. |
| 17 | Aktifkan push pada dua profil browser, kirim dan balas laporan | Jika konfigurasi benar, kedua profil menerima push masing-masing; klik membuka detail. |
| 18 | Tolak izin push atau putus koneksi layanan push | Fungsi inti tetap berjalan; notifikasi tersimpan di lonceng. |
| 19 | Logout atau nonaktifkan push | Langganan perangkat tersebut dicabut. |

## Catatan verifikasi paket

PHP lint dan pemeriksaan sintaks JavaScript dilakukan di lingkungan penyusun. XAMPP/MySQL, pengiriman push riil, dan instalasi Composer harus diuji di komputer pengguna; tidak ada klaim pengujian end-to-end database atau push yang belum dilakukan.

Pemeriksaan fungsi render JavaScript dengan data contoh (Node VM) lulus untuk form admin, agenda forum, dashboard, serta detail mahasiswa tanpa form admin. Percobaan uji interaksi browser Chromium tidak dapat dijalankan karena navigasi diblokir oleh lingkungan pengujian. Karena itu uji klik, database, dan push end-to-end masih perlu dilakukan di XAMPP.

- Verifikasi tambahan: tombol demo tidak muncul pada halaman login/registrasi; POST action `demo` harus ditolak (403); password salah ditolak.
