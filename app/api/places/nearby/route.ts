import { NextResponse } from "next/server";
import { locationBasedList } from "@/lib/tourapi/client";

/**
 * 좌표 주변 관광지 조회 (TourAPI locationBasedList2).
 * GET /api/places/nearby?lat=37.57&lng=126.97&radius=1000&contentTypeId=12
 * 좌표만 쿼리로 받고, serviceKey는 서버에서만 사용.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng가 필요합니다." }, { status: 400 });
  }

  const radius = Number(searchParams.get("radius")) || 1000;
  const ctid = searchParams.get("contentTypeId");
  const contentTypeId = ctid ? Number(ctid) : undefined;

  try {
    const places = await locationBasedList({
      latitude: lat,
      longitude: lng,
      radius,
      contentTypeId,
    });
    return NextResponse.json({ places });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
