import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * publishable key 만 사용 — NEXT_PUBLIC_ 노출 허용 키(구 anon 대체).
 * RLS 정책이 보안 경계이므로, 민감 작업은 서버에서 secret key 로 처리한다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
