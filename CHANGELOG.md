# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/).

## [0.2.1] — 2026-09-22

Audit GH issues #1–#12 (prioritas keamanan → integritas → cleanup).

### Keamanan
- **XSS escaping** (issue #11): `file_url` kini di-escape di href panel admin; tombol Preview tidak lagi memakai `onclick` inline + `escapeJs` (yang tidak escape `"` untuk konteks atribut) — diganti `data-preview` + `addEventListener`.
- **Validasi upload vs README** (issue #12): batasan ekstensi/ukuran tetap client-side (UX); dicatat eksplisit di README bahwa boundary keamanan = RLS + login.
- CDN **`supabase-js` dipin ke `2.116.0` + SRI** (issue #1) di `index.html`/`admin.html` — sebelumnya `@2` float.

### Diperbaiki
- **Integritas data upload/hapus** (issue #3): insert gagal setelah upload → file storage di-rollback; hapus kini delete row dulu (cek error), storage best-effort belakangan.
- **Session expired** (issue #8): listener `onAuthStateChange` → kembali ke login bila sesi habis selagi panel terbuka; error RLS/401/403 di upload/hapus diterjemahkan jadi "silakan login ulang" (batch upload berhenti pada error auth).
- **Unduh di admin** (issue #4): atribut `download` lintas-origin (tidak berfungsi) diganti `target="_blank" rel="noopener"` — samakan dengan dashboard publik.
- **Select tanpa range** (issue #2): `.range(0, 4999)` di publik + admin agar tidak terpotong diam-diam di default 1000 baris PostgREST; limit dicatat di README.
- **Modal preview** (issue #9): tutup via tombol Escape, fokus pindah ke tombol tutup saat dibuka, iframe `referrerpolicy="no-referrer"`. (Sandbox iframe sengaja dilewati — berisiko merusak PDF viewer.)

### Ditambahkan
- **Loading state** dashboard publik (issue #6): "Memuat..." sebelum fetch pertama.
- **`util.js`** (issue #12): `escapeHtml` + `isAllowedExt` satu implementasi dipakai `app.js`/`admin.js`/`check.node.js` — sebelumnya `escapeHtml` terduplikasi 3× dan self-check menguji salinan, bukan kode produksi.

### Dihapus
- CSS mati (issue #5): `.narrow`, `.list`, `.row`, `.row-info`, `.row-actions`, `.status-icon`.
- `netlify.toml` + bagian Netlify di README (issue #7): deploy = GitHub Pages; komentar lama masih menyebut `?key=` era `ADMIN_KEY`.

## [0.2.0] — 2026-08-22

### Keamanan
- **Autentikasi admin pindah ke Supabase Auth**: kunci admin yang tersimpan polos di source code dihapus total (`ADMIN_KEY` tidak ada lagi di `config.js` maupun `admin.html`). Login panel admin kini memakai email + password melalui `supabase.auth.signInWithPassword`, sesi bertahan via session bawaan supabase-js, dan tersedia tombol Keluar.
- **RLS ditutup untuk anon** (lihat `supabase-auth-migration.sql`): INSERT/DELETE pada tabel `templates` dan bucket storage `templates` kini hanya untuk user terautentikasi. Sebelumnya siapa pun bisa menulis/menghapus data langsung ke Supabase memakai anon key dari source publik. Baca tetap publik.
- Konfigurasi duplikat inline di `admin.html` dihapus; semua konfigurasi lewat satu `config.js`.
- Kunci admin lama yang pernah terekspos di repo ini dianggap terbakar — jangan dipakai ulang di sistem lain.

### Diperbaiki
- **`styles.css` rusak sebagian dibenahi**: blok `.modal-close` tidak pernah ditutup sehingga aturan CSS setelahnya ikut salah muat; duplikat blok `.btn` dengan kurung yatim dihapus.
- Warna progress bar upload disamakan dengan palet situs (oranye aksen) — sebelumnya hijau default yang tidak konsisten.
- Nama file daftar upload dirender lewat `textContent` (bukan template string) agar bebas XSS dari nama file.

### Ditambahkan
- Feedback taktil pada tombol utama (efek tekan saat diklik).
- Label aksesibel pada form login; pesan error login spesifik (kredensial salah vs koneksi gagal).

## [0.1.0] — 2026-08-07

### Ditambahkan
- `CHANGELOG.md` — file riwayat perubahan.
- Fitur **download file via blob** di halaman publik.

### Diubah
- **Download template** (`app.js`): sebelumnya `cardHtml` memakai `<a href="..." download>` yang atribut `download`-nya diabaikan di banyak browser mobile (iOS Safari, sebagian Android), sehingga hanya membuka file dan tidak menyimpan.
  1. Ubah tombol Download memanggil fungsi `download(url, name)`, mengambil file sebagai `blob`, membuat object URL, lalu memicu unduhan.
  2. Perbaikan: `URL.revokeObjectURL` ditunda (setelah 60 detik) agar browser sempat memulai download; tambah fallback bila `fetch` gagal. Fallback memakai `location.href` (navigasi) karena `window.open` diblokir popup-blocker di mobile sehingga terkesan "tidak ada reaksi".
  3. Adaptasi per-platform: **iOS** → navigasi ke viewer PDF asli (tersedia tombol Bagikan / Simpan ke Files); **Android** → unduhan langsung ke folder Downloads.
- `escapeJs()` dibuat untuk men-escape string pada atribut `onclick` inline agar aman dari tanda kutip/garis miring.

### Hasil uji langsung (07-08-2026)
- Pendekatan blob gagal diam-diam di: **Android Chrome/Brave** (`a.click()` blob di-ignore — butuh user-activation), **iOS Safari & Chrome** (navigasi ke `blob:` ditolak).
- **iOS Brave justru berhasil** — membuka file di tab baru dan muncul tombol Share/Save.

Kesimpulan: hanya **navigasi ke URL file asli** yang reaksi di semua perangkat. Karena hosting statis (GitHub Pages) + Supabase tidak dapat mengirim header `Content-Disposition: attachment`, **tombol Download dikembalikan menjadi link langsung** ke `file_url` (buka di tab baru). Simpan berkas di mobile lewat viewer PDF bawaan (Share / Simpan ke Files di iOS, ikon download di Chrome Android).

### Diubah — README
- `README.md` dirombak agar sesuai kondisi aktual: hosting **GitHub Pages + Cloudflare** (bukan lagi "Netlify disarankan"), alamat live `register.hafizhsatria.com`, penambahan `CHANGELOG.md` di daftar struktur, dan bagian baru **Perilaku download** yang menjelaskan cara simpan file di mobile.

### Catatan deploy
- Situs di **GitHub Pages** (di balik cache Cloudflare). Setiap push ke `main` butuh ~1–2 menit untuk build + purge cache sebelum versi teranyar aktif di https://register.hafizhsatria.com.
- Repo remote: `https://github.com/hafizhsatriaped/register-BNI` (branch `main`).
- `config.js` berisi `SUPABASE_URL`, anon key, dan `ADMIN_KEY` yang terekspos publik (tanpa login; lihat README).

### Ringkasan komit sebelumnya
- `6938b25` Update styles.css
- `92b6d2f`, `d71daf0`, `1472420`, `aac5031`, `272b67f` — Update admin.html / admin.js
- `ae408cc`, `d56e08d`, `ee78329`, `598993c` — Update admin.html / admin.js / styles.css
- `fd7ee5b`, `c11b182` — Add files via upload
- `cd4e8a0`, `f85ba03` — Create CNAME; `3616b8c` — Delete CNAME