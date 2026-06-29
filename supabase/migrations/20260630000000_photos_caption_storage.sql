-- Phase 3 기반: photos.caption + Storage(photos 버킷) + storage RLS
-- 적용: supabase db push (또는 SQL Editor 붙여넣기)

-- ── 1) 사진별 메모(caption) 〔CLAUDE §8.6〕 ─────────────────
alter table public.photos add column if not exists caption text;

-- ── 2) 비공개 Storage 버킷 'photos' ───────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- ── 3) storage.objects RLS — 본인 폴더만 접근 ──────────────
-- 파일 경로 규칙: {user_id}/{record_id}/{photo_id}.{ext}
-- → 최상위 폴더명이 곧 소유자 uid. 비공개 버킷 + 본인만 읽기/쓰기.
create policy "photos_select_own"
  on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_update_own"
  on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_delete_own"
  on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
