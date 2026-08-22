-- ============================================================
-- Migrasi keamanan register-BNI: tutup tulis anon, wajib login
-- Sudah DIJALANKAN di project tadmzfqxfpbcurybcjet (2026-08-22).
-- File ini disimpan sebagai catatan/referensi — jalankan ulang
-- hanya untuk setup project Supabase baru.
--
-- Sebelum: siapa pun (anon) bisa INSERT/DELETE template & file.
--   - Tabel templates: "Public insert/delete access" ({public})
--   - Storage.objects: "Public access wrvard_1/2" — TANPA filter
--     bucket (membuka semua bucket!)
-- Sesudah: baca tetap publik; tulis/hapus hanya user terautentikasi.
--
-- Urutan aman:
--   1. Buat user admin dulu (Authentication → Users → Add user,
--      atau lewat SQL — lihat catatan di bawah)
--   2. Jalankan skrip ini
--   3. Deploy kode panel admin versi email+password
--
-- Catatan buat user via SQL (kalau tidak lewat dashboard):
--   insert into auth.users (...) wajib mengisi confirmation_token='',
--   recovery_token='', email_change='', email_change_token_new=''
--   (NULL membuat login gagal 500), plus baris auth.identities.
-- ============================================================

-- 1) Tabel templates: ganti policy tulis publik → authenticated
drop policy if exists "Public insert access" on public.templates;
drop policy if exists "Public delete access" on public.templates;
drop policy if exists "templates_insert_anon" on public.templates;
drop policy if exists "templates_delete_anon" on public.templates;

create policy "templates_insert_auth"
  on public.templates for insert to authenticated
  with check (true);

create policy "templates_delete_auth"
  on public.templates for delete to authenticated
  using (true);

-- 2) Storage: hapus policy tulis publik apa pun namanya, ganti
--    versi terautentikasi yang terikat bucket 'templates'
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('INSERT', 'DELETE', 'UPDATE')
      and coalesce(qual, '') || coalesce(with_check, '') !~* 'bucket_id'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

drop policy if exists "objects_insert_anon" on storage.objects;
drop policy if exists "objects_delete_anon" on storage.objects;

create policy "objects_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'templates');

create policy "objects_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'templates');

-- 3) Verifikasi cepat (opsional):
--    sebagai anon, INSERT harus ditolak RLS:
--      insert into public.templates (name, file_url) values ('tes', 'tes');
--    harus error "new row violates row-level security policy".
