# AGENTS.md

Panduan untuk agen AI yang bekerja di repo ini.

## Proyek

Dashboard template register BNI — statis HTML/CSS/JS + Supabase (storage + database). Baca publik; admin login **Supabase Auth** (email+password) dan RLS menutup tulis/hapus untuk non-login. Live: https://register.hafizhsatria.com (GitHub Pages + Cloudflare).

## Struktur

```
index.html    → dashboard publik: grid, cari, preview PDF (iframe), download
admin.html    → panel admin: upload, list, hapus (login email+password)
app.js        → logika dashboard publik
admin.js      → logika panel admin (login Supabase Auth, sesi, logout)
util.js       → escapeHtml + isAllowedExt bersama (app/admin + check.node.js)
config.js     → SUPABASE_URL, SUPABASE_ANON_KEY saja (publik by design)
styles.css    → gaya bersama
supabase-auth-migration.sql → skrip RLS wajib dijalankan di Supabase
check.node.js → self-check: `node check.node.js`
CHANGELOG.md  → riwayat semua perubahan
```

## Aturan kerja

- **Statis murni.** Tanpa build step, tanpa framework, tanpa backend. Jangan tambah dependency/package manager.
- **Supabase** dipakai langsung via CDN `supabase-js@2` (lihat `<script>` di kedua HTML).
- **Tidak ada rahasia di source.** `config.js` hanya berisi URL + anon key (publik by design). Jangan pernah menaruh password/kunci admin di file mana pun; proteksi tulis ada di RLS + Supabase Auth, bukan di JS.
- Setiap privasi/perilaku yang berubah, dokumenkan di `CHANGELOG.md` (format Keep a Changelog, bahasa Indonesia) dan README bila perlu.
- Bahasa ui = Indonesia.

## Perilaku penting (jangan regresi)

- **Auth admin**: login via `sb.auth.signInWithPassword`; sesi dicek dengan `sb.auth.getSession()` saat halaman dibuka; logout memanggil `signOut()` lalu reload.
- **RLS**: INSERT/DELETE tabel `templates` dan bucket storage hanya untuk `authenticated`. Skrip: `supabase-auth-migration.sql`. Baca tetap publik (`templates_select_anon`).

- **Download** = link langsung ke `file_url` (buka tab baru), bukan blob. Blob gagal diam-diam di mobile (lihat CHANGELOG 0.1.0).
- **Preview** PDF via iframe; Excel tidak di-preview, langsung download.

## Validasi / verifikasi

- Situs statis → uji lokal: buka `index.html` di browser, atau `npx serve .` (opsional; tanpa JS run).
- Self-check util: `node check.node.js` (harus `Self-check OK`).
- Tidak ada lint/test framework. Cek manual: konsol browser tidak ada error.
- Pastikan `config.js` tidak diubah kredensialnya secara tidak sengaja.

## Deploy

- Posisi via GitHub Pages dari branch `main`. Tiap push butuh ~1–2 menit `build` + `purge` cache Cloudflare sebelum perubahan aktif.