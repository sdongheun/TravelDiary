-- TravelDiary 초기 스키마 + RLS
-- 적용: `supabase link --project-ref cwdgjgsfbgvammkdhcgy` 후 `supabase db push`
--       (또는 이 파일 전체를 Supabase 대시보드 SQL Editor에 붙여넣어 실행)
-- 설계 근거: CLAUDE.md §6·§7, doc/디로그_분석.md §5

-- ────────────────────────────────────────────────────────────
-- 공통 트리거 함수
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- profiles : 앱 프로필 (auth.users 1:1). 가입 시 자동 생성.
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  locale      text not null default 'ko',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is '앱 사용자 프로필 (auth.users 1:1). 후기 작성자 표시용 공개 읽기.';

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 가입 시 프로필 자동 생성 (security definer = RLS 우회 삽입)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- places : TourAPI 장소 캐시. 공개 읽기 / 쓰기는 서버 secret 키만.
-- ────────────────────────────────────────────────────────────
create table public.places (
  id              uuid primary key default gen_random_uuid(),
  content_id      text unique not null,          -- TourAPI contentid
  content_type_id text,                           -- 12=관광지,14=문화시설,...
  title           text not null,
  addr1           text,
  lat             double precision,               -- 위도 (TourAPI mapY)
  lng             double precision,               -- 경도 (TourAPI mapX)
  overview        text,                           -- detailCommon2 개요
  first_image     text,
  cat1            text,
  cat2            text,
  cat3            text,
  raw             jsonb,                          -- 원본 응답 보관(선택)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.places is 'TourAPI 장소 캐시 (공개 읽기, 쓰기는 서버 secret 키만 = RLS 우회).';

create trigger trg_places_updated
  before update on public.places
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- diaries : 일기 (records 묶음 기반). 늘 비공개. 본인만.
-- ────────────────────────────────────────────────────────────
create table public.diaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  tone        text check (tone in ('plain', 'emotional', 'humor')),  -- 담백/감성/유머
  body        text,                               -- AI 보조 본문(사용자 편집)
  diary_date  date,                               -- 여행 날짜(그룹핑 기준)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.diaries is '일기 (records 묶음 기반, 늘 비공개).';

create index idx_diaries_user on public.diaries(user_id);

create trigger trg_diaries_updated
  before update on public.diaries
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- records : 코스(=장소) 단위 기록. 비공개. 본인만.
--   자동 채움(EXIF 시각/좌표·날씨) + 메모 + 질문답변 + AI 정리.
-- ────────────────────────────────────────────────────────────
create table public.records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  place_id      uuid references public.places(id) on delete set null,   -- 확정 전/실패 시 null
  diary_id      uuid references public.diaries(id) on delete set null,  -- 일기 작성 시 묶임
  captured_at   timestamptz,                      -- 대표(최초 사진) 촬영시각 = 타임라인 정렬키
  manual_location text,                           -- EXIF 없을 때 fallback 입력
  weather       text,                             -- 자동 채움(후순위, nullable)
  memo          text,                             -- 한 줄 메모
  answers       jsonb not null default '[]'::jsonb,  -- [{questionId, question, text}]
  ai_summary    text,                             -- AI 감정·상황 정리(질문 건너뛰면 null)
  ai_tags       text[],                           -- AI 태깅
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.records is '코스(장소) 단위 기록, 비공개. 사진은 photos(1:N). captured_at = 타임라인 정렬키.';

create index idx_records_user     on public.records(user_id);
create index idx_records_diary    on public.records(diary_id);
create index idx_records_place    on public.records(place_id);
create index idx_records_captured on public.records(captured_at);

create trigger trg_records_updated
  before update on public.records
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- photos : 사진 (records 1:N). 사진별 url·EXIF·순서. 비공개(본인만).
-- ────────────────────────────────────────────────────────────
create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references public.records(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- RLS 단순화용
  url         text not null,                    -- Supabase Storage URL
  media_type  text not null default 'photo',    -- 영상 확장 예약
  captured_at timestamptz,                      -- EXIF 촬영시각
  lat         double precision,                 -- EXIF 위도
  lng         double precision,                 -- EXIF 경도
  sort_order  int not null default 0,           -- 표시 순서
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.photos is '사진 (records 1:N). 사진별 url·EXIF·순서. 비공개(본인만).';

create index idx_photos_record   on public.photos(record_id);
create index idx_photos_captured on public.photos(captured_at);

create trigger trg_photos_updated
  before update on public.photos
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- reviews : 장소별 공개 후기. 공개 읽기 / 작성·수정 본인. 장소당 1개.
-- ────────────────────────────────────────────────────────────
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  place_id    uuid not null references public.places(id) on delete cascade,
  content     text not null,
  rating      int check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, place_id)                       -- 한 사람당 장소별 1개
);
comment on table public.reviews is '장소별 공개 후기 (공개 읽기, 작성·수정 본인).';

create index idx_reviews_place on public.reviews(place_id);

create trigger trg_reviews_updated
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- review_likes : 후기 좋아요. 중복 방지(PK 복합). 공개 읽기 / 본인 토글.
-- ────────────────────────────────────────────────────────────
create table public.review_likes (
  review_id   uuid not null references public.reviews(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (review_id, user_id)
);
comment on table public.review_likes is '후기 좋아요 (중복 방지: PK(review_id, user_id)).';

-- ════════════════════════════════════════════════════════════
-- RLS — 모든 테이블 활성화 후 정책 명시 (누락 시 일기 노출 사고)
-- ════════════════════════════════════════════════════════════
alter table public.profiles     enable row level security;
alter table public.places       enable row level security;
alter table public.diaries      enable row level security;
alter table public.records      enable row level security;
alter table public.photos       enable row level security;
alter table public.reviews      enable row level security;
alter table public.review_likes enable row level security;

-- profiles : 공개 읽기(작성자 표시), 본인만 삽입/수정
create policy profiles_select_all on public.profiles
  for select using (true);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- places : 공개 읽기. 쓰기 정책 없음 → 일반 키 쓰기 불가, 서버 secret 키(RLS 우회)만 가능
create policy places_select_all on public.places
  for select using (true);

-- diaries : 본인만 (select/insert/update/delete)
create policy diaries_all_own on public.diaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- records : 본인만
create policy records_all_own on public.records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- photos : 본인만
create policy photos_all_own on public.photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reviews : 공개 읽기, 쓰기/수정/삭제 본인
create policy reviews_select_all on public.reviews
  for select using (true);
create policy reviews_insert_own on public.reviews
  for insert with check (auth.uid() = user_id);
create policy reviews_update_own on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_delete_own on public.reviews
  for delete using (auth.uid() = user_id);

-- review_likes : 공개 읽기(카운트), 본인 토글
create policy review_likes_select_all on public.review_likes
  for select using (true);
create policy review_likes_insert_own on public.review_likes
  for insert with check (auth.uid() = user_id);
create policy review_likes_delete_own on public.review_likes
  for delete using (auth.uid() = user_id);
