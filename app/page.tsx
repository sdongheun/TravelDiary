import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 라우트: 미로그인 시 로그인 페이지로
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">
          {profile?.nickname ?? "여행자"}님, 환영합니다 👋
        </h1>
        <p className="mt-2 text-sm text-neutral-500">{user.email}</p>
        <Link
          href="/capture"
          className="mt-6 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          + 기록 추가 (사진)
        </Link>

        <form action={signout} className="mt-8">
          <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            로그아웃
          </button>
        </form>
      </div>
    </main>
  );
}
