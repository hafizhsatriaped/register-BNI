# AGENTS.md

Panduan untuk agen AI yang bekerja di repo ini.

## Proyek

Dashboard template register BNI — statis HTML/CSS/JS + Supabase (storage + database). Tanpa login; admin dilindungi URL key. Live: https://register.hafizhsatria.com (GitHub Pages + Cloudflare).

## Struktur

```
index.html    → dashboard publik: grid, cari, preview PDF (iframe), download
admin.html    → panel admin: upload, list, hapus (login key)
app.js        → logika dashboard publik
admin.js      → logika panel admin (termasuk form login key)
config.js     → SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_KEY (terekspos publik)
styles.css    → gaya bersama
netlify.toml  → redirect /admin → admin.html (hanya untuk Netlify)
CHANGELOG.md  → riwayat semua perubahan
```

## Aturan kerja

- **Statis murni.** Tanpa build step, tanpa framework, tanpa backend. Jangan tambah dependency/package manager.
- **Supabase** dipakai langsung via CDN `supabase-js@2` (lihat `<script>` di kedua HTML).
- Jangan hardcode kredensial baru di `index.html`; konfigurasi ada di `config.js` (publik, desain "auth none"). `admin.html` masih menyimpan konfigurasi inline.
- Setiap privasi/perilaku yang berubah, dokumenkan di `CHANGELOG.md` (format Keep a Changelog, bahasa Indonesia) dan README bila perlu.
- Bahasa ui = Indonesia.

## Perilaku penting (jangan regresi)

- **Download** = link langsung ke `file_url` (buka tab baru), bukan blob. Blob gagal diam-diam di mobile (lihat CHANGELOG 0.1.0).
- **Preview** PDF via iframe; Excel tidak di-preview, langsung download.

## Validasi / verifikasi

- Situs statis → uji lokal: buka `index.html` di browser, atau `npx serve .` (opsional; tanpa JS run).
- Tidak ada lint/test framework. Cek manual: konsol browser tidak ada error.
- Pastikan `config.js` tidak diubah kredensialnya secara tidak sengaja.

## Deploy

- Posisi via GitHub Pages dari branch `main`. Tiap push butuh ~1–2 menit `build` + `purge` cache Cloudflare sebelum perubahan aktif.