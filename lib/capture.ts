import { createClient } from "@/lib/supabase/client";
import type { TourPlace } from "@/lib/tourapi/client";

/** 캡처 한 장의 입력 단위 (사진 + 메모 + 선택 장소). */
export interface CaptureItem {
  id: string; // 로컬 uuid (Storage 파일명에 사용)
  file: File;
  caption: string;
  capturedAt: string | null; // EXIF ISO
  lat: number | null; // EXIF 위도
  lng: number | null; // EXIF 경도
  place: TourPlace | null; // 확정 TourAPI 장소
  manualLocation: string; // 비관광지 직접 입력 장소명(place 없을 때)
}

/** 확정 장소를 places 캐시에 upsert → place_id 반환 (서버 라우트, secret 키). */
async function upsertPlace(place: TourPlace): Promise<string | null> {
  const res = await fetch("/api/places/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentId: place.contentId,
      contentTypeId: place.contentTypeId,
      title: place.title,
      addr1: place.addr1,
      lat: place.mapY, // TourAPI mapY = 위도
      lng: place.mapX, // TourAPI mapX = 경도
      firstImage: place.firstImage,
      cat1: place.cat1,
      cat2: place.cat2,
      cat3: place.cat3,
    }),
  });
  if (!res.ok) return null;
  const { place: row } = await res.json();
  return row?.id ?? null;
}

function ext(file: File): string {
  const m = file.name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "jpg";
}

/**
 * items를 같은 장소(place.contentId)끼리 묶어 record 1개씩 생성하고,
 * 각 사진을 Storage(`{user}/{record}/{id}.ext`)에 업로드 후 photos 행 기록.
 * 장소 없는 사진은 개별 record(place_id null)로.  〔CLAUDE §8.6 자동 그룹핑〕
 */
export async function submitCapture(
  items: CaptureItem[],
): Promise<{ recordIds: string[] }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 장소별 place_id 확보 (중복 upsert 방지)
  const placeIdByContent = new Map<string, string>();
  for (const it of items) {
    if (it.place && !placeIdByContent.has(it.place.contentId)) {
      const pid = await upsertPlace(it.place);
      if (pid) placeIdByContent.set(it.place.contentId, pid);
    }
  }

  // 그룹핑: TourAPI 장소→contentId, 직접입력→이름, 둘 다 없으면 개별
  const groups = new Map<string, CaptureItem[]>();
  items.forEach((it, idx) => {
    const manual = it.manualLocation.trim();
    const key = it.place
      ? `p:${it.place.contentId}`
      : manual
        ? `m:${manual}`
        : `n:${idx}`;
    const arr = groups.get(key) ?? [];
    arr.push(it);
    groups.set(key, arr);
  });

  const recordIds: string[] = [];
  for (const [key, groupItems] of groups) {
    const placeId = key.startsWith("p:")
      ? (placeIdByContent.get(key.slice(2)) ?? null)
      : null;
    const manualLocation = key.startsWith("m:") ? key.slice(2) : null;
    const capturedAt =
      groupItems
        .map((i) => i.capturedAt)
        .filter((t): t is string => !!t)
        .sort()[0] ?? null;

    const { data: rec, error: recErr } = await supabase
      .from("records")
      .insert({
        user_id: user.id,
        place_id: placeId,
        manual_location: manualLocation,
        captured_at: capturedAt,
      })
      .select("id")
      .single();
    if (recErr || !rec) throw new Error("기록 생성 실패: " + recErr?.message);
    recordIds.push(rec.id);

    let order = 0;
    for (const it of groupItems) {
      const path = `${user.id}/${rec.id}/${it.id}.${ext(it.file)}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, it.file, {
          upsert: false,
          contentType: it.file.type || undefined,
        });
      if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);

      const { error: phErr } = await supabase.from("photos").insert({
        record_id: rec.id,
        user_id: user.id,
        url: path,
        caption: it.caption || null,
        captured_at: it.capturedAt,
        lat: it.lat,
        lng: it.lng,
        sort_order: order++,
      });
      if (phErr) throw new Error("사진 기록 실패: " + phErr.message);
    }
  }
  return { recordIds };
}
