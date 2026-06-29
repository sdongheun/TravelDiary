# 개발 계획 (MVP 로드맵)

> 1차 공모전 MVP 기준. AI/Gemini 영역은 **팀원 담당** → 본 계획은 그 외 영역을 중심으로 하고, AI 호출 지점은 **인터페이스 경계 + mock**으로 비워둔다.
> 규칙은 `CLAUDE.md`, 전체 기획은 `doc/여행일기앱_기획정리.md` 참조.
>
> ✅ = 완료 / 🔄 = 진행 중 / (빈칸) = 미착수. **작업 완료 시 이 문서를 갱신한다.**

---

## Phase 0 — 프로젝트 셋업 ✅ (완료)

- [x] Next.js 16.2.9 (App Router, TypeScript, Tailwind 4) 프로젝트 생성 — 빌드·타입체크 통과
- [x] 폴더 구조 잡기 (`app/`, `lib/tourapi/`, `lib/supabase/`, `lib/ai/`, `app/api/`) · `components/`는 화면 작업 시 추가
- [x] `.env.example` / `.env.local` 작성 (Supabase publishable/secret, TourAPI, 카카오맵, Gemini 자리)
- [x] env 키 연결·**라이브 검증** — TourAPI(좌표 조회 OK), Supabase(URL+publishable, health OK). secret/카카오/Gemini는 미입력
- [x] `.gitignore` 확인 (`.env*` 제외됨)
- [x] Supabase 클라이언트 유틸 — `client`(publishable) / `server`(SSR·async cookies) / `admin`(secret 서버 전용) · **신키 체계**
- [ ] Capacitor 설정은 구조만 (`capacitor.config`) — 실제 래핑은 웹 완성 후 (후순위)

> 추가 완료: `lib/tourapi/client.ts`(KorService2 규칙 반영 스켈레톤), `lib/ai/{types,mock}.ts`(AI 경계 + mock), 세션 갱신 `proxy.ts`(+`lib/supabase/proxy.ts`) — Phase 1·5 일부 선행.

---

## Phase 1 — 인증 (이메일+비밀번호) ✅

- [x] 세션 갱신 proxy (`proxy.ts` + `lib/supabase/proxy.ts`, Next 16 규칙)
- [x] Supabase Auth 연동 — `app/login`(폼+서버액션 login/signup/signout). 이메일+비번만(소셜·전화 제외)
- [x] 보호 라우트 — `app/page.tsx` 미로그인 시 `/login` 리다이렉트
- [x] `profiles` 연동 — 가입 시 자동생성 트리거 라이브 검증(닉네임·locale, 삭제 cascade)
- [x] (대시보드) Site URL 등록 + 이메일 확인 OFF(개발) 완료
- [x] **브라우저 E2E 수동검증** — 회원가입 → 로그아웃 → 로그인 동작 확인
- [ ] (후속) 소셜 로그인(카카오→구글/애플)은 앱 출시 단계에서 비파괴적 추가

---

## Phase 2 — DB 스키마 + RLS ✅ (적용·검증 완료)

- [x] 마이그레이션 SQL 작성 — `supabase/migrations/20260626000000_init.sql` (Supabase CLI 구조 `supabase init` 완료)
- [x] 테이블 정의: `profiles`(auth 1:1), `places`, `diaries`, `records`, **`photos`(records 1:N)**, `reviews`, `review_likes`
- [x] **사진 모델 A안** — 사진별 EXIF(`captured_at`,`lat`,`lng`)·`media_type`·`sort_order`는 `photos`로 분리, `records`는 장소(코스) 단위로 슬림
- [x] `records` 컬럼 〔디로그 분석 §5-1〕: `captured_at`(대표=타임라인 정렬키), `weather`(nullable), `manual_location`(fallback), `answers` jsonb(`{questionId,question,text}`)
- [x] `diaries`↔`reviews` 물리 분리 〔§5-2〕 · `records.diary_id` 평면 FK
- [x] **RLS 정책 전 테이블 작성** (CLAUDE.md §6) — `records`/`diaries`/`photos` 본인만, `reviews`/`places`/`profiles` 공개읽기, 쓰기 본인/서버
- [x] 가입 시 `profiles` 자동 생성 트리거 + `updated_at` 트리거
- [x] **원격 적용** — `supabase link` + `supabase db push` 완료 (CLI 워크플로)
- [x] 적용 후 검증 — 7테이블 존재 ✅, `places` 서버 쓰기(secret, RLS 우회) ✅, RLS 격리(미인증 records 차단·places 쓰기 401) ✅
- [ ] 회원가입 시 profile 자동생성 트리거 — Phase 1 인증 붙일 때 실사용 검증
- [ ] (Phase 3 준비) 사진용 Storage 버킷 생성 — 다음 단계

---

## Phase 3 — 사진 업로드 + EXIF (핵심 순서 준수) 🔄

- [x] **마이그레이션 0002 작성**: `photos.caption` + Storage `photos` 버킷(비공개) + storage RLS (적용은 `supabase db push` 대기)
- [x] 클라이언트 EXIF 추출 유틸 `lib/exif.ts` (`extractExif`/`sortByCapturedAt`) — 압축 전 호출 전제
- [ ] **다중 선택 → EXIF 시각 시간순 정렬 → 사진별 페이지("다음")** 흐름 (UI)
- [ ] 업로드 파이프라인: Storage(`{user_id}/...`) 업로드 → `photos` 행 기록
- [ ] 사진별 `caption`(선택) 입력 · 같은 `place_id` 자동 그룹핑 → 1 record
- [ ] Supabase Storage 업로드 → `photos.url` 기록 · 좌표·시각 → `photos`
- [ ] 좌표·시각 기반 **날씨 자동 채움**(선택적, nullable) 〔디로그 장점 흡수〕
- [ ] (EXIF 없는 사진 fallback: 수동 위치 입력 + 한글 키워드 검색)
- [ ] AI 감정 질문은 **장소(record) 단위 1회** 〔CLAUDE §8.6〕

---

## Phase 4 — TourAPI 장소 제안 🔄 (클라이언트 골격 완료)

- [x] 서버 전용 TourAPI 클라이언트 (`lib/tourapi/client.ts`) — `KorService2`, mapX=경도/mapY=위도, `server-only`
- [x] `locationBasedList2` 좌표 주변 조회 함수 (`detailCommon2`/`detailImage2`/`searchKeyword2` 포함)
- [x] 방어적 파싱 (응답 key 누락·빈 문자열 대비)
- [x] API Route `GET /api/places/nearby` (좌표 주변) — 라이브 검증 ✅ (경복궁 20건)
- [x] API Route `GET /api/places/search?q=` (한글 키워드 fallback) — 라이브 검증 ✅ (경복궁 12건) 〔디로그 약점 §4〕
- [x] API Route `POST /api/places/upsert` (확정 장소 → places 캐시, 서버 secret) — 빌드 통과(적용 후 검증)
- [ ] "이 장소 OO 맞나요?" 제안 UI → 확정/수정 (캡처 흐름에 통합)
- [ ] 확정 장소를 `records`에 연결 + place_id 자동 그룹핑

---

## Phase 5 — AI 흐름 (팀원 담당, 경계만 구현) 🔄

- [x] 입출력 타입 계약 정의 (`lib/ai/types.ts` — 질문 생성 / 감정 정리 / 일기 변환 / 다국어)
- [x] **mock 구현**으로 흐름 연결 (`lib/ai/mock.ts` — `getAiProvider()`만 교체하면 실제 Gemini로 전환)
- [ ] AI 호출 API Route 골격 (`app/api/ai/...`) — 서버에서만, 키 비노출
- [ ] 일기 생성 스트리밍 고려 (Vercel 타임아웃 대비)
- [ ] **AI 질문 '건너뛰기' 기본 제공** 〔디로그 분석 §5-4〕 — 메모만으로도 일기 생성 가능(입력 최소화 ↔ 감정 심화 양립)
- [ ] 〔팀원〕 Gemini Flash 실제 구현 → `getAiProvider()` 교체

---

## Phase 6 — 일기 + 후기

- [ ] records 기반 타임라인 정리 — **정렬키 `captured_at` → 장소 순** 〔디로그 분석 §5-5, 다수 사진 일괄 업로드 대응〕
- [ ] 문체 선택(담백/감성/유머) → 일기 본문 생성(AI 경계 통해) → `diaries` 저장(비공개)
- [ ] 장소(`places`) 기반 **다녀온 곳 지도 뷰** 〔디로그 장점 흡수〕
- [ ] 장소별 공개 후기 작성/조회 (`reviews`), 좋아요
- [ ] 같은 장소 혼행 후기 묶음 보기

---

## Phase 7 — 리마인더 + 배포

- [ ] 리마인더(웹 푸시 또는 이메일) — "어제 다녀온 OO 정리해볼까요?"
- [ ] Vercel 배포 + 도메인
- [ ] 데모 전 Supabase 깨워두기 / 무료 한도 점검
- [ ] **1차 심사 전 실제 런칭 확인** (자격요건)

---

## 작업 순서 권장

Phase 0 → 1 → 2 까지가 기반(셋업·인증·DB). 그 위에서 3(사진·EXIF) → 4(TourAPI)가 핵심 차별점이라 우선순위 높음. 5는 팀원과 인터페이스만 먼저 합의. 6·7은 그 뒤.
