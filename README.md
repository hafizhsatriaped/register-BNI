# register-template-dashboard-bni

Dashboard template register (BNI). Statis HTML/CSS/JS + Supabase (storage + database). Baca publik; panel admin dilindungi **Supabase Auth** (email + password) dan RLS menutup tulis/hapus untuk non-login.

Live: **https://register.hafizhsatria.com** (hosting GitHub Pages + CDN Cloudflare).

## Struktur

```
index.html    → dashboard publik: grid, cari, preview PDF (iframe), download
admin.html    → panel admin: upload, list, hapus (login email+password)
app.js        → logika dashboard publik
admin.js      → logika panel admin (login Supabase Auth, sesi, logout)
util.js       → util bersama (escapeHtml, isAllowedExt) — dipakai app/admin + check.node.js
config.js     → isi SUPABASE_URL dan SUPABASE_ANON_KEY saja
styles.css    → gaya bersama
supabase-auth-migration.sql → skrip RLS wajib dijalankan di Supabase
check.node.js → self-check: `node check.node.js`
CHANGELOG.md  → riwayat semua perubahan
```

## Setup Supabase (sekali saja)

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan skema dasar:

```sql
-- 1) Tabel
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  file_url text not null,
  created_at timestamptz not null default now()
);

-- 2) Bucket publik
insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

-- 3) RLS dasar: baca publik
alter table templates enable row level security;
create policy "templates_select_anon" on templates
  for select using (true);
```

3. Jalankan **`supabase-auth-migration.sql`** (SQL Editor) — menutup INSERT/DELETE anon dan membukanya hanya untuk user terautentikasi.
4. **Authentication → Users → Add user**: buat akun admin (email + password).
5. **Project Settings → API**: salin Project URL dan anon public key ke `config.js`.

## Deploy

**GitHub Pages (dipakai saat ini):**
1. Push ke repo `main` di GitHub → aktifkan Pages dari branch `main`.
2. Untuk domain kustom, buat file `CNAME` berisi domain (contoh: `register.hafizhsatria.com`).
3. Akses admin: `<situs>/admin.html`, login dengan email + password admin.
4. Catatan: tiap push butuh ~1–2 menit untuk build + purge cache CDN sebelum versi teranyar aktif.

## Perilaku download (penting)

- Tombol **Download** adalah link langsung ke `file_url` (dibuka di tab baru).
- Di **desktop**, file terunduh otomatis ke folder Download.
- Di **mobile**, browser membuka file di viewer PDF bawaan. Simpan berkas lewat fitur native viewer: iOS → tombol **Share → Save to Files**; Android Chrome → ikon download di viewer.
- Alasan: pendekatan download via blob gagal diam-diam di beberapa browser mobile (lihat `CHANGELOG.md`), dan hosting statis tidak dapat mengirim header `Content-Disposition: attachment` untuk memaksa unduhan.

## Catatan keamanan

- Panel admin memakai **Supabase Auth** (email + password); sesi dikelola supabase-js.
- RLS menutup INSERT/DELETE untuk anon — hanya user terautentikasi yang bisa menulis/menghapus (lihat `supabase-auth-migration.sql`). Baca tetap publik.
- Anon key (`SUPABASE_ANON_KEY`) memang dirancang publik oleh Supabase; tanpa RLS ia tidak memberikan proteksi apa pun, dengan RLS ia aman.
- Kunci admin lama yang pernah terekspos di riwayat repo ini dianggap **terbakar**: jangan dipakai ulang untuk sistem lain, dan ganti bila masih dipakai di mana pun.

## Batasan

- Excel (xls/xlsx) tidak di-preview, langsung download (sesuai spesifikasi opsional).
- Preview PDF via iframe; beberapa browser/plugin bisa memblokir tampilannya — tombol Download selalu tersedia.
- Select data pakai `.range(0, 4999)` — maksimum 5000 template terbaru tampil; di atas itu perlu pagination.
- Validasi tipe/ukuran upload (PDF/Excel, ≤5 MB) hanya di browser (UX); boundary keamanan ada di RLS/wajib login.
