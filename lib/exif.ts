import exifr from "exifr";

/**
 * 사진 EXIF에서 좌표·촬영시각 추출 (클라이언트).
 *
 * ⚠️ 반드시 압축/리사이즈 "전"에 원본 File로 호출할 것 — 가공 시 EXIF 소실(CLAUDE §8).
 * EXIF가 없으면 각 필드는 null. 호출부에서 fallback(수동 위치/현재시각) 처리.
 */
export interface PhotoExif {
  lat: number | null; // 위도
  lng: number | null; // 경도
  capturedAt: string | null; // ISO 문자열 (촬영시각)
}

export async function extractExif(file: File): Promise<PhotoExif> {
  let lat: number | null = null;
  let lng: number | null = null;
  let capturedAt: string | null = null;

  try {
    // 좌표
    const gps = await exifr.gps(file).catch(() => null);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      lat = gps.latitude;
      lng = gps.longitude;
    }

    // 촬영시각 (DateTimeOriginal 우선)
    const parsed = await exifr
      .parse(file, ["DateTimeOriginal", "CreateDate", "ModifyDate"])
      .catch(() => null);
    const dt: Date | undefined =
      parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? parsed?.ModifyDate;
    if (dt instanceof Date && !Number.isNaN(dt.getTime())) {
      capturedAt = dt.toISOString();
    }
  } catch {
    // 파싱 실패해도 throw 하지 않음 — 호출부에서 null 처리
  }

  return { lat, lng, capturedAt };
}

/** 여러 파일을 EXIF 촬영시각 기준 오름차순 정렬 (시각 없는 건 뒤로). */
export async function sortByCapturedAt(
  files: File[],
): Promise<{ file: File; exif: PhotoExif }[]> {
  const withExif = await Promise.all(
    files.map(async (file) => ({ file, exif: await extractExif(file) })),
  );
  return withExif.sort((a, b) => {
    const ta = a.exif.capturedAt ? Date.parse(a.exif.capturedAt) : Infinity;
    const tb = b.exif.capturedAt ? Date.parse(b.exif.capturedAt) : Infinity;
    return ta - tb;
  });
}
