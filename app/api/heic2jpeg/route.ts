import convert from "heic-convert";

/**
 * HEIC/HEIF → JPEG 변환 (서버, 순수 JS).
 * 브라우저는 HEIC를 렌더 못 하고, 클라이언트 wasm 변환(heic2any)은 번들러 환경에서 불안정 →
 * 서버에서 안정적으로 변환.
 * POST multipart/form-data { file } → image/jpeg 바이트
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "file이 필요합니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const output = await convert({
      buffer: new Uint8Array(inputBuffer),
      format: "JPEG",
      quality: 0.9,
    });
    return new Response(Buffer.from(output), {
      status: 200,
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "변환 실패: " + (e as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
