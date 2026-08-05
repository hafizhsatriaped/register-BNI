# register-template-dashboard-bni

Dashboard template register (BNI). Statis HTML/CSS/JS + Supabase (storage + database). Tanpa login; admin dilindungi URL key.

## Struktur

```
index.html   → dashboard publik: grid, cari, preview PDF (iframe), download
admin.html   → panel admin: upload, list, hapus (dengan konfirmasi)
config.js    → isi SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_KEY
app.js       → logika dashboard publik
admin.js     → logika panel admin
styles.css   → gaya bersama
netlify.toml → redirect /admin → admin.html (khusus Netlify)
```

## Setup Supabase (sekali saja)

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan:

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

-- 3) RLS — aplikasi tanpa login, anon boleh baca/tulis
alter table templates enable row level security;

create policy "templates_select_anon" on templates
  for select using (true);
create policy "templates_insert_anon" on templates
  for insert with check (true);
create policy "templates_delete_anon" on templates
  for delete using (true);

-- 4) Storage: izinkan anon upload/hapus (baca lewat URL publik, tanpa policy)
create policy "objects_insert_anon" on storage.objects
  for insert with check (bucket_id = 'templates');
create policy "objects_delete_anon" on storage.objects
  for delete using (bucket_id = 'templates');
```

3. **Project Settings → API**: salin Project URL dan anon public key ke `config.js`. Ganti `ADMIN_KEY` dengan string panjang acak.

## Deploy

**Netlify** (disarankan): drag & drop folder ini ke app.netlify.com, atau `netlify deploy`. Akses admin: `<situs>/admin?key=KEY`.

**GitHub Pages**: push folder ke repo, aktifkan Pages. Tanpa redirect, akses admin pakai `<situs>/admin.html?key=KEY`.

## Catatan keamanan

- `ADMIN_KEY` dan anon key ada di source code client — siapa pun yang buka DevTools bisa melihatnya. Proteksi ini hanya menghalangi pengguna awam.
- Untuk produksi sungguhan: pakai Supabase Auth + RLS berbasis role, admin login asli.
- RLS membuka INSERT/DELETE ke anon — konsekuensi desain "auth: none". Ganti jika data sensitif.

## Batasan

- Excel (xls/xlsx) tidak di-preview, langsung download (sesuai spesifikasi opsional).
- Preview PDF via iframe; beberapa browser/plugin bisa memblokir tampilannya — tombol Download selalu tersedia.
