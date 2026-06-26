@AGENTS.md

# CLAUDE.md

> 혼자 여행자를 위한 AI 여행 일기 앱 (TourAPI 활용 공모전 출품작).
> 전체 기획은 `doc/여행일기앱_기획정리.md`, 개발 로드맵은 `doc/DEVELOPMENT_PLAN.md` 참조.
> 이 문서는 **개발 시 반드시 지켜야 할 규칙**만 압축한다.
>
> 📁 **문서 관리 규칙:** 모든 문서 파일은 `doc/` 폴더에서 관리한다(루트 예외: `CLAUDE.md`·`AGENTS.md`·`README.md`).
> **작업을 완료할 때마다 `doc/DEVELOPMENT_PLAN.md`의 체크리스트를 갱신한다.**

> ⚠️ 이 프로젝트의 Next.js는 최신 버전이라 학습 데이터와 API·관례가 다를 수 있다(AGENTS.md 참조).
> 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 확인할 것.

---

## 1. 프로젝트 한 줄 정의

혼행족이 장소마다 **사진 + 한 줄 메모 + 짧은 질문 답변**을 남기면, AI가 그때의 상황·감정을 정리하고 **일기 작성을 보조**하는 앱. 부가가치는 **장소별 후기 게시판**(관광 선순환). 핵심 차별점 = **AI 질문 + TourAPI 공식데이터 + 혼행 후기 선순환**.

핵심 흐름: 사진 업로드 → EXIF 좌표 추출 → TourAPI 장소 제안 → 메모 + AI 동적 질문 → AI 감정·상황 정리 → 문체 선택 일기 생성 → 일기 비공개 / 장소별 후기만 공개.

---

## 2. 확정 기술 스택 (변경 금지)

| 영역 | 선택 |
|---|---|
| 프론트+백엔드 | **Next.js (App Router)**. 별도 백엔드 프레임워크(Nest/Express) 사용 안 함. 서버 로직은 Route Handler에서 처리 |
| 앱 출시 | **Capacitor** 래핑(웹·앱 단일 코드). React Native 사용 안 함 |
| 호스팅 | **Vercel** (서버리스) |
| DB·인증·스토리지 | **Supabase** (Postgres + Auth + Storage) |
| AI | **Google Gemini Flash** (무료 티어, billing 비활성 유지) |
| 로그인 | **이메일+비밀번호 우선**. 소셜 로그인은 추후 |

> 위 스택을 임의로 바꾸거나 대체 라이브러리를 제안하지 말 것. 더 나은 안이 있어도 변경하지 말고 주석/메모로만 의견을 남길 것.

---

## 3. 팀 역할 분담 (현재)

- **AI/Gemini 영역(질문 생성·감정 정리·일기 변환·다국어 프롬프트)** → **팀원이 담당** (프롬프트 작성 중). 이쪽 코드는 인터페이스(입력·출력 형태)만 합의하고 구현은 비워두거나 목(mock)으로 처리.
- **그 외 전 영역(프로젝트 셋업, TourAPI 연동, 사진/EXIF, Supabase DB·Auth·Storage·RLS, UI 흐름, 후기 게시판, 리마인더)** → 본 작업 범위.

> AI 호출 지점은 서버 API Route에 **경계(interface)**로 분리해, 팀원 프롬프트가 그 자리에 끼워지도록 설계할 것.

---

## 3.5 개발 방식 — 오케스트레이션 / 하네스 엔지니어링 (이 프로젝트의 원칙)

- 조사·분석·다파일 리뷰·반복 구현 등 **병렬화·검증이 이득인 작업은 멀티에이전트 워크플로(오케스트레이션)로** 수행한다. 혼자 순차로 훑지 말 것.
- 패턴: **fan-out(여러 렌즈 병렬 조사) → 적대적 검증(claim refute) → 종합(synthesis)**. 발견은 출처·confidence를 달고, 미검증 항목은 명시한다.
- 작업을 잘게 쪼개 각 단계의 입출력 계약을 먼저 정하고, AI/외부의존부는 경계+mock으로 분리하는 **하네스 엔지니어링**을 기본으로 한다.
- 산출물(조사 보고서 등)은 `doc/`에 저장하고 `doc/DEVELOPMENT_PLAN.md`를 갱신한다.

## 3.6 레퍼런스 앱 — 디로그(D·LOG)

- 우리 앱의 **1차 레퍼런스(직접 경쟁)**는 **디로그(D·LOG)**. 사진 올리면 시간·위치·날씨 자동 채움 + 감정 기록 + 여행지도 + 웹·앱.
- **장점은 흡수, 차별성은 유지:** 디로그의 입력 최소화·자동 채움·감성 시각화는 벤치마킹하되, 우리의 3대 차별점(**AI 질문으로 감정 유도 / TourAPI 공식데이터 결합 / 혼행 후기 선순환**)은 절대 희석하지 말 것.
- 상세 분석: `doc/디로그_분석.md` 참조.

---

## 4. 외부 키 / 계정 준비 상태

- ✅ **TourAPI serviceKey 발급됨** (공공데이터포털 data.go.kr)
- ✅ **Supabase 프로젝트 생성됨** — **새 API 키 체계 사용**(publishable / secret, `sb_publishable_…` / `sb_secret_…`). URL·publishable 입력됨, secret 미입력
- 🗺 **지도 = 카카오맵** (developers.kakao.com). JS 키(클라이언트 노출형) + REST 키(서버, 선택)
- ⏳ **Gemini API 키 / 프롬프트** — 팀원 작업 중
- ⏸ **날씨 API** — 보류(Phase 3 선택적 자동 채움 시 추가)

> Supabase 키 네이밍(중요): 이 프로젝트는 **신키 체계**다. 코드/ENV는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(구 anon), `SUPABASE_SECRET_KEY`(구 service_role)를 쓴다. `ANON_KEY`/`SERVICE_ROLE_KEY` 명칭 쓰지 말 것.
> 세션 갱신용 `middleware.ts`(루트) + `lib/supabase/middleware.ts` 구성됨 — 인증의 전제.

키 저장: 모두 `.env.local`. git 커밋 금지(`.gitignore`가 `.env*` 제외 확인됨).
- **클라이언트 노출 허용:** Supabase URL, Supabase **publishable key**, **카카오맵 JS 키**(`NEXT_PUBLIC_` 접두사 — JS 키는 반드시 카카오 콘솔 [플랫폼>Web]에 도메인 등록해 보호)
- **절대 클라이언트 노출 금지:** Supabase **secret key**, Gemini API key, TourAPI `serviceKey`, **카카오 REST API 키** → 이 키가 필요한 작업은 **전부 서버(API Route/서버 컴포넌트)에서만**

---

## 5. TourAPI 호출 규칙 (가장 자주 틀리는 부분)

- **반드시 신버전 `KorService2` 사용.** 구버전 `KorService1` 및 접미사 `1`(locationBasedList1 등) **사용 금지**.
- 사용 오퍼레이션: `locationBasedList2`(좌표 주변 조회), `detailCommon2`(공통/개요), `detailIntro2`(운영시간·요금), `detailImage2`(이미지), `areaCode2`(지역코드), `searchKeyword2`(키워드 검색).
- **호출은 반드시 서버에서.** `serviceKey`를 클라이언트 번들에 절대 노출 금지.
- **좌표 순서 주의:** `mapX = 경도(longitude)`, `mapY = 위도(latitude)`. (구글맵은 위도,경도 순 — 반대로 넣으면 엉뚱한 위치)
- 위치 기반 조회는 좌표만 있으면 됨(지역코드 불필요). 지역코드는 "특정 지역 전체 목록" 같은 별도 기능에서만 `areaCode2`로 사용.
- `_type=json`, `MobileOS`, `MobileApp`은 매 요청 필수.
- 기본 호출 예시(서버):
  ```
  https://apis.data.go.kr/B551011/KorService2/locationBasedList2
    ?serviceKey={DECODED_KEY}&MobileOS=ETC&MobileApp=TripDiary&_type=json
    &mapX={경도}&mapY={위도}&radius=2000&numOfRows=20&pageNo=1&arrange=E
  ```
- `contentTypeId`: 12=관광지, 14=문화시설, 15=축제공연행사, 28=레포츠, 32=숙박, 38=쇼핑, 39=음식점.
- 응답에 데이터가 없으면 key 자체가 빠질 수 있음 → **모든 필드 접근은 optional/방어적 파싱**.

---

## 6. 보안 · RLS 규칙 (사고 방지)

- **Supabase RLS(Row Level Security) 필수.** 테이블 생성 시 RLS를 켜고 정책 명시:
  - `records`, `diaries`: 본인(`auth.uid()`)만 읽기/쓰기. **타인 접근 불가.**
  - `reviews`: 누구나 읽기(공개), 작성·수정은 본인만.
  - `places`: 읽기 공개(캐시), 쓰기는 서버만.
- RLS 누락 시 남의 일기 노출 = 심각한 사고 → 테이블마다 정책 반드시 확인.

---

## 7. 데이터 구조 (초안)

- **users** — 회원 (Supabase Auth 연동)
- **places** — TourAPI 장소 캐시 (장소명·좌표·카테고리·공식 설명)
- **records** — 코스 단위 기록 (사진 URL, 한 줄 메모, 질문 답변, AI 정리 결과) · 비공개
- **diaries** — 일기 (records 기반, 문체 선택, AI 보조 본문) · 늘 비공개
- **reviews** — 장소별 공개 후기 (좋아요, 간단 후기) · 공개

사진 저장: 실제 파일 → Supabase **Storage**, 위치(URL)·EXIF 좌표·시각 → **DB(records)**에 텍스트로.

---

## 8. 핵심 로직 순서 (반드시 이 순서)

### 사진 업로드 처리
1. 클라이언트에서 사진 **EXIF 좌표·촬영시각 먼저 추출** (압축/리사이즈 전에).
2. 추출한 좌표·시각을 서버로 전송 → DB(records) 저장.
3. 사진 파일을 **Supabase Storage**에 업로드.
4. Storage 반환 **URL을 DB(records)에 기록** (원본은 DB에 넣지 않음).
5. 좌표로 서버에서 **TourAPI `locationBasedList2` 호출** → 주변 장소 후보 → "이 장소 OO 맞나요?" 제안.

> EXIF는 이미지 가공 시 사라질 수 있으므로 1번이 반드시 최우선.

### AI 호출 (Gemini Flash, 서버에서만 — 팀원 프롬프트 연결 지점)
- 작업: ① 카테고리별 질문 생성 ② 메모+답변 → 감정·상황 정리 ③ 일기 본문 생성(문체: 담백/감성/유머) ④ 다국어 출력.
- 일기 생성은 응답이 길 수 있으니 **스트리밍** 고려(Vercel 함수 타임아웃 대비).

---

## 9. 1차(공모전) MVP 범위 — 욕심내지 말 것

- **포함:** 회원가입/로그인(이메일+비번), 사진 업로드+EXIF, TourAPI 장소 제안, AI 질문→정리→일기(문체 선택), 일기 비공개 보관, 장소별 공개 후기(좋아요·간단 후기), 리마인더(웹 푸시 또는 이메일).
- **제외(후순위):** 외부 SNS 변환, 소셜 로그인, 외국인 다국어(구조만 대비), 네이티브 푸시(앱 출시 후).
- 범위를 임의로 키우지 말 것. **완성도(끊김 없는 핵심 흐름)가 수상의 핵심.**

---

## 10. 운영 주의

- Supabase 무료는 **7일 무활동 시 일시정지** → 데모 전 반드시 깨워둘 것.
- 사진은 원본 저장으로 시작하되 용량 모니터링 → 초과 조짐 시 업로드 전 클라이언트 압축(품질 85~90%).
- **1차 심사 전까지 실제 런칭(상용) 필수** = 자격요건.
