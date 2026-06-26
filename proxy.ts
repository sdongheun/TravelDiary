import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16: `middleware` 규칙이 `proxy`로 변경됨. 동작은 동일(요청 전 세션 갱신).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자산을 제외한 모든 경로에서 세션 갱신.
     * _next 정적/이미지, favicon, 일반 이미지 확장자는 제외.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
