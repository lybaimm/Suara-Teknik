# Skenario pengujian Suara Teknik

## Fade in dan fokus kolom akun

Fade in diperiksa pada 16 halaman publik, mahasiswa, dan admin untuk
masing-masing lebar 390 dan 1366 piksel tanpa error JavaScript. Bagian
beranda muncul sekali saat pertama terlihat dan tidak mengulang animasi
saat scroll kembali. Preferensi pengurangan gerak menonaktifkan fade in.
Kolom Masuk dan Daftar diperiksa dengan klik dan keyboard pada kedua
ukuran; garis fokus mengikuti tepi bagian dalam kolom tanpa jarak di luar.

## Navigasi dan beranda terbaru — 24 November 2026

Menu publik mengikuti urutan Beranda, Agenda, Cara Kerja, dan Tentang.
Penanda aktif mengikuti scroll turun/naik tanpa melewati Cara Kerja pada
viewport 390 × 844, 1366 × 768, 1366 × 900, dan 1920 × 1080.
Garis desktop dan latar menu mobile bergeser halus; preferensi pengurangan
gerak menonaktifkan animasinya. Klik menu, satu penanda aktif, dan riwayat
browser diperiksa pada lebar 390 dan 1366 piksel.

Refresh pada bagian halaman utama kembali ke Beranda. Tautan langsung ke
bagian tertentu dan refresh halaman login tetap berfungsi. Teks beranda
terbaru, judul dengan koma, serta penghapusan label tambahan juga diperiksa.
Pemeriksaan mobile pada lebar 320, 390, dan 768 piksel memastikan tidak ada
overflow horizontal, tanggal kalender tetap persegi, dan menu setinggi
minimal 44 piksel. Dialog detail forum diperiksa pada lebar 390 piksel.
Pemeriksaan menggunakan emulasi Chrome, bukan perangkat fisik.

## Ringkasan agenda dan blok warna

Tanggal yang memiliki forum memakai kotak warna penuh sesuai status.
Daftar di samping kalender memiliki tinggi yang sama pada desktop dan
dibatasi pada layar kecil. Maksimal empat forum ditampilkan per halaman
desktop/tablet dan dua pada ponsel. Judul/topik diringkas dua baris;
Lihat detail membuka dialog berisi judul, tanggal, jam, tempat, dan topik
lengkap. Tombol Tutup atau Escape mengembalikan fokus ke pemicu dialog.

Uji Chrome pada 320, 390, 768, dan 1366 piksel lulus untuk warna solid,
teks panjang, dialog detail, penutupan dan pemulihan fokus, pagination
seluruh 18 forum dummy, penyaringan tanggal, batas tinggi panel dan
kesejajaran dengan kalender desktop. Tidak ada error JavaScript.

## Kalender agenda di beranda

Kalender bulanan serta tabel semua forum bulan terpilih tampil tanpa membuka
halaman lain. Empat kategori memiliki warna dan jumlah masing-masing:
mendatang (biru), berlangsung (kuning), selesai (hijau), dan dibatalkan
(merah). Klik tanggal menyaring tabel; Tampilkan semua forum bulan ini
menghapus filter tanggal tanpa berpindah bulan. Bulan ini kembali ke bulan
berjalan. Kalender dapat membuka bulan sebelumnya untuk melihat riwayat.

Uji Chrome pada lebar 320, 390, 768, dan 1366 piksel lulus untuk perpindahan
bulan/tahun, Februari tahun kabisat, dua agenda pada satu tanggal, agenda
dibatalkan, pengecualian draf, kondisi tanpa jadwal, fokus keyboard, dan
overflow horizontal. Tidak ada error JavaScript. Data contoh hanya dipasang
di browser pengujian dan tidak disimpan ke database.

Tambahan uji kategori pada 320, 390, 768, 1024, dan 1366 piksel lulus untuk
warna/jumlah, pemilihan tanggal, riwayat bulan lalu, status pada batas jam WIB,
pembaruan otomatis setiap menit, fokus keyboard, jadwal tanpa jam selesai,
kondisi kosong, dan tabel responsif. Uji PHP dalam transaksi memastikan forum
terbit/dibatalkan yang sudah lewat tersedia bagi publik, sedangkan draf dan
agenda nonforum tidak ikut terbuka; transaksi dibatalkan setelah pengujian.

## Verifikasi responsif pada versi final — 24 November 2026

Perapian mobile diterapkan kembali dengan mempertahankan fitur Agenda versi
final. Header menampilkan semua menu tanpa geser horizontal, termasuk empat
menu admin dan tombol Daftar/Masuk. Kontrol header memiliki tinggi minimal
44 px, navigasi 48 px, dan isian formulir ponsel memakai teks 16 px.
Kartu laporan menempatkan status di bawah isi, serta formulir laporan, akun,
dan Agenda menata tombol secara vertikal pada layar kecil.

Chrome melalui Playwright memeriksa 17 halaman publik/mahasiswa/admin pada
lebar 320, 360, 390, 430, 670, 768, 900, 1024, dan 1366 piksel, total
153 kombinasi. Seluruhnya lulus tanpa overflow horizontal pada dokumen/menu
atau error JavaScript. Tautan navigasi dicoba untuk setiap peran dan ukuran.
Pada 320 dan 390 piksel turut dicoba dialog notifikasi, pilihan metode
langsung/forum pada formulir tindak lanjut, serta logout.

Agenda contoh untuk memeriksa judul/lokasi panjang dan formulir edit hanya
dipasang dalam respons API di browser pengujian; tidak disimpan ke database.
Tangkapan mobile memakai kepadatan 3x. Pengujian ini memakai emulasi Chrome,
belum perangkat Android atau iPhone fisik.

## Hasil verifikasi versi final

Uji API berjalan dengan PHP 8.4.27 dan MariaDB 11.8.9 pada database uji
terpisah. Impor awal, impor ulang, pemulihan snapshot, dan migrasi dari
snapshot versi sebelumnya berhasil. Jumlah akun, laporan, dan riwayat
versi sebelumnya tetap sama setelah migrasi.

Uji API mencakup registrasi, NIM duplikat, login NIM dan email akun lama,
hak akses admin, publikasi agenda khusus Forum Advokasi, perubahan status
langsung dan forum, tanggapan privat, serta notifikasi dalam website.
Chromium pada viewport 390 × 844 juga memeriksa hero, header, opsi
scroll halus, agenda tanpa login, pengelolaan agenda, dialog konfirmasi,
kontrol status admin, dan login mahasiswa. Sintaks PHP dan JavaScript
diperiksa. Apache XAMPP belum diuji.

Versi tanpa akun demo diuji dengan database kosong melalui skrip impor.
Uji Chromium mencakup tombol Daftar dan Masuk pada lebar 320 piksel,
registrasi, login mahasiswa dan admin, serta publikasi khusus Forum Advokasi.

Versi logo header dan notifikasi lonceng diuji di Chromium, PHP, dan MariaDB.
Pengujian mencakup logo desktop dan ponsel, laporan baru, perubahan status,
laporan selesai, pembukaan detail, dan penandaan notifikasi sudah dibaca.

## Skenario uji manual

Gunakan akun dan database uji untuk mengikuti skenario berikut.

| No | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Registrasi akun, email/NIM duplikat | Akun baru berhasil; duplikat ditolak. |
| 2 | Login dengan NIM mahasiswa atau email admin, lalu logout | Hak akses sesuai peran; logout mengakhiri sesi. |
| 3 | Mahasiswa membuat laporan dengan/tanpa foto | Laporan tersimpan, popup sukses, detail dengan ID ST-xxx. |
| 4 | Foto bukan JPG/PNG/WebP atau >3 MB | Ditolak dengan pesan validasi. |
| 5 | Edit dan hapus laporan sebelum verifikasi | Data berubah/dihapus, popup muncul; admin mendapat notifikasi. |
| 6 | Admin menentukan langsung dan memilih Diverifikasi, Sedang Diproses, Selesai | Status baru dan riwayat tercatat; popup admin; notifikasi mahasiswa. |
| 7 | Mahasiswa mencoba edit setelah verifikasi | Aksi tidak tersedia; API menolak. |
| 8 | Admin memilih Forum Advokasi, periode II, Menunggu Forum Advokasi | Masuk daftar Laporan Forum Advokasi dan statistik mahasiswa; metode tampil. |
| 9 | Admin mengisi pembaruan jadwal melalui Tanggapan Admin tanpa mengubah status | Kedua tanggapan tersimpan, mahasiswa menerima notifikasi baru. |
| 10 | Admin memilih Telah Dibahas tanpa hasil | Ditolak; isi hasil untuk menyimpan. |
| 11 | Isi hasil forum, pilih Telah Dibahas lalu Selesai | Hasil terlihat mahasiswa; status dan tanggapan tersimpan. |
| 12 | Pilih Ditolak tanpa alasan | Ditolak sampai alasan diisi. |
| 13 | Filter periode/metode/status dan pencarian | Hanya laporan yang cocok ditampilkan. |
| 14 | Klik lonceng, klik notifikasi dan tandai semua dibaca | Laporan terkait dibuka, jumlah belum dibaca turun, persist setelah refresh. |
| 15 | Akun mahasiswa berbeda membuka ID laporan milik orang lain | Tidak dapat mengakses detail/API foto milik akun lain. |
| 16 | Upgrade database lama | Akun dan laporan lama tetap ada; tabel/kolom baru tersedia. |
| 17 | Admin membuat draf, menerbitkan, mengubah, dan membatalkan agenda | Pengunjung melihat agenda terbaru yang terbit dan keterangan pembatalan. |
| 18 | Pengunjung membuka agenda dari beranda | Jadwal, gedung, ruang dan pokok bahasan bisa dibaca tanpa masuk. |
| 19 | Registrasi ulang dengan NIM sama, huruf berbeda dan email baru | Database tetap menyimpan satu akun untuk NIM tersebut. |
| 20 | Admin menyelesaikan laporan langsung dari status awal | Status berubah setelah admin mengisi penjelasan. |
