import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 요청마다 Supabase 세션(토큰)을 갱신해 쿠키에 반영한다.
 * 루트 `middleware.ts` 에서 호출. 인증(Phase 1)의 전제.
 *
 * 주의: createServerClient 생성과 supabase.auth.getUser() 호출 사이에
 * 다른 로직을 넣지 말 것 — 세션 갱신 타이밍이 어긋날 수 있다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 이 호출이 만료 직전 토큰을 리프레시한다.
  await supabase.auth.getUser();

  return supabaseResponse;
}
