import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버(서버 컴포넌트 / Route Handler)용 Supabase 클라이언트.
 * 로그인 사용자 세션 기준으로 동작하며 RLS 정책의 적용을 받는다.
 * Next 16: cookies() 는 async.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 set 호출 시 무시 가능 (미들웨어가 세션 갱신 담당).
          }
        },
      },
    },
  );
}
