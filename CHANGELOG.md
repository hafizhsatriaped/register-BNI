# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/).

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