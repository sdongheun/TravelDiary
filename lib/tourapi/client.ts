import "server-only";

/**
 * TourAPI (한국관광공사) 서버 전용 클라이언트.
 *
 * 규칙 (CLAUDE.md §5):
 *  - 반드시 신버전 KorService2 사용 (KorService1 / 접미사 1 금지)
 *  - serviceKey 는 서버에서만. 클라이언트 노출 금지.
 *  - 좌표 순서: mapX = 경도(longitude), mapY = 위도(latitude)
 *  - _type=json, MobileOS, MobileApp 매 요청 필수
 *  - 응답 데이터 없으면 key 자체가 빠질 수 있음 → 방어적 파싱
 */

const BASE = "https://apis.data.go.kr/B551011/KorService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "TripDiary";

/** TourAPI contentTypeId */
export const CONTENT_TYPE = {
  관광지: 12,
  문화시설: 14,
  축제공연행사: 15,
  레포츠: 28,
  숙박: 32,
  쇼핑: 38,
  음식점: 39,
} as const;

function serviceKey(): string {
  const key = process.env.TOURAPI_SERVICE_KEY;
  if (!key) throw new Error("TOURAPI_SERVICE_KEY 가 설정되지 않았습니다.");
  return key;
}

/** KorService2 의 임의 오퍼레이션 호출 (서버 전용). */
async function callTourApi(
  operation: string,
  params: Record<string, string | number | undefined>,
): Promise<unknown[]> {
  const search = new URLSearchParams({
    serviceKey: serviceKey(),
    MobileOS: MOBILE_OS,
    MobileApp: MOBILE_APP,
    _type: "json",
  });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }

  const res = await fetch(`${BASE}/${operation}?${search.toString()}`, {
    // 장소 정보는 자주 안 변하므로 캐시 여지를 둔다 (필요 시 호출부에서 조정).
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) {
    throw new Error(`TourAPI ${operation} 실패: HTTP ${res.status}`);
  }

  const json = (await res.json()) as TourApiEnvelope;
  // 방어적 파싱: 데이터 없으면 items 가 빈 문자열("")이거나 item key 가 빠질 수 있음.
  const items = json?.response?.body?.items;
  const item = items && typeof items === "object" ? items.item : undefined;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

/** 좌표 주변 장소 조회. mapX=경도, mapY=위도. */
export async function locationBasedList(opts: {
  longitude: number; // mapX
  latitude: number; // mapY
  radius?: number; // m, 기본 2000
  contentTypeId?: number;
  numOfRows?: number;
  pageNo?: number;
}): Promise<TourPlace[]> {
  const items = await callTourApi("locationBasedList2", {
    mapX: opts.longitude,
    mapY: opts.latitude,
    radius: opts.radius ?? 2000,
    contentTypeId: opts.contentTypeId,
    numOfRows: opts.numOfRows ?? 20,
    pageNo: opts.pageNo ?? 1,
    arrange: "E", // 거리순
  });
  return items.map(toTourPlace);
}

/** 키워드 검색. */
export async function searchKeyword(keyword: string, numOfRows = 20): Promise<TourPlace[]> {
  const items = await callTourApi("searchKeyword2", { keyword, numOfRows });
  return items.map(toTourPlace);
}

/** 공통 개요 정보 (detailCommon2). */
export async function detailCommon(contentId: string): Promise<Record<string, unknown> | null> {
  const items = await callTourApi("detailCommon2", { contentId });
  return (items[0] as Record<string, unknown>) ?? null;
}

/** 이미지 정보 (detailImage2). */
export async function detailImage(contentId: string): Promise<string[]> {
  const items = await callTourApi("detailImage2", { contentId, imageYN: "Y" });
  return items
    .map((it) => (it as { originimgurl?: string }).originimgurl)
    .filter((u): u is string => !!u);
}

// ── 타입 ──────────────────────────────────────────────────────

export interface TourPlace {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr1?: string;
  mapX?: number; // 경도
  mapY?: number; // 위도
  dist?: number; // 거리(m)
  firstImage?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
}

interface TourApiEnvelope {
  response?: {
    body?: {
      items?: { item?: unknown | unknown[] } | "";
    };
  };
}

function toTourPlace(raw: unknown): TourPlace {
  const r = raw as Record<string, string | undefined>;
  return {
    contentId: r.contentid ?? "",
    contentTypeId: r.contenttypeid ?? "",
    title: r.title ?? "",
    addr1: r.addr1,
    mapX: r.mapx ? Number(r.mapx) : undefined,
    mapY: r.mapy ? Number(r.mapy) : undefined,
    dist: r.dist ? Number(r.dist) : undefined,
    firstImage: r.firstimage,
    cat1: r.cat1,
    cat2: r.cat2,
    cat3: r.cat3,
  };
}
