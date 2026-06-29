import ExifReader from "exifreader";

/**
 * 사진 EXIF에서 좌표·촬영시각 추출 (클라이언트).
 *
 * exifreader 사용 — JPEG뿐 아니라 **HEIC/HEIF**(아이폰 기본)도 안정적으로 읽음.
 * ⚠️ 압축/리사이즈 "전"의 원본으로 호출할 것 — 가공 시 EXIF 소실(CLAUDE §8).
 * EXIF가 없으면 각 필드 null → 호출부에서 fallback(수동 위치/시각).
 */
export interface PhotoExif {
  lat: number | null; // 위도
  lng: number | null; // 경도
  capturedAt: string | null; // "YYYY-MM-DDTHH:MM:SS" (로컬, 타임존 없음)
}

export async function extractExif(file: File): Promise<PhotoExif> {
  let lat: number | null = null;
  let lng: number | null = null;
  let capturedAt: string | null = null;

  try {
    const tags = await ExifReader.load(file, { expanded: true });

    const glat = tags.gps?.Latitude;
    const glng = tags.gps?.Longitude;
    if (typeof glat === "number" && typeof glng === "number") {
      lat = glat;
      lng = glng;
    }

    // EXIF DateTime은 "YYYY:MM:DD HH:MM:SS" 형식 (타임존 없음)
    const dt =
      tags.exif?.DateTimeOriginal?.description ??
      tags.exif?.DateTimeDigitized?.description;
    if (typeof dt === "string") {
      const m = dt.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (m) capturedAt = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    }
  } catch {
    // 파싱 실패해도 throw 하지 않음 — null 반환
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
