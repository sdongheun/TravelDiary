import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 관리자 클라이언트 (secret key, 구 service_role 대체).
 * ⚠️ RLS 를 우회하므로 절대 클라이언트 번들에 노출 금지.
 * places 캐시 쓰기 등 "서버만 써야 하는" 작업에만 사용한다.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
