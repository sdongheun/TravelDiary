/**
 * 표시 가능한 이미지로 변환 (클라이언트).
 *
 * 브라우저는 HEIC/HEIF(아이폰 기본)를 <img>로 렌더하지 못함 → JPEG로 변환.
 * 변환은 서버 라우트(/api/heic2jpeg, 순수 JS)에서 — 클라이언트 wasm은 번들러 환경에서 불안정.
 * ⚠️ EXIF는 변환 전 원본에서 먼저 읽을 것.
 * 변환 실패 시 원본을 그대로 반환(흐름 막지 않음 · 미리보기만 안 보일 수 있음).
 */
export async function ensureDisplayable(file: File): Promise<File> {
  const isHeic =
    /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;

  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/heic2jpeg", { method: "POST", body: form });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${msg}`);
    }
    const blob = await res.blob();
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
    });
  } catch (e) {
    console.error("HEIC→JPEG 변환 실패, 원본 사용:", e);
    return file;
  }
}
