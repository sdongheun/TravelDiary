import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 확정된 TourAPI 장소를 places 캐시에 upsert하고 place_id를 반환.
 * places 쓰기는 서버(secret)만 가능(RLS) → 로그인 사용자만 호출 허용.
 * POST /api/places/upsert  body: { contentId, title, contentTypeId?, addr1?, lat?, lng?, firstImage?, cat1?, cat2?, cat3? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.contentId || !body?.title) {
    return NextResponse.json(
      { error: "contentId, title이 필요합니다." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("places")
    .upsert(
      {
        content_id: String(body.contentId),
        content_type_id: body.contentTypeId ? String(body.contentTypeId) : null,
        title: String(body.title),
        addr1: body.addr1 ?? null,
        lat: body.lat ?? null, // 위도 (TourAPI mapY)
        lng: body.lng ?? null, // 경도 (TourAPI mapX)
        first_image: body.firstImage ?? null,
        cat1: body.cat1 ?? null,
        cat2: body.cat2 ?? null,
        cat3: body.cat3 ?? null,
      },
      { onConflict: "content_id" },
    )
    .select("id, content_id, title, lat, lng")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ place: data });
}
