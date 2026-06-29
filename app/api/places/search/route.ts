import { NextResponse } from "next/server";
import { searchKeyword } from "@/lib/tourapi/client";

/**
 * 한글 키워드 장소 검색 (TourAPI searchKeyword2).
 * GET /api/places/search?q=경복궁
 * EXIF 좌표가 없거나 자동 제안이 안 맞을 때 fallback 〔디로그 약점 보완〕.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q(검색어)가 필요합니다." }, { status: 400 });
  }

  try {
    const places = await searchKeyword(q);
    return NextResponse.json({ places });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
