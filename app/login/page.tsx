import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">TravelDiary</h1>
          <p className="mt-1 text-sm text-neutral-500">
            혼자 여행하는 사람을 위한 AI 여행 일기
          </p>
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <form className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">이메일</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">비밀번호</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="current-password"
              placeholder="6자 이상"
              className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
            />
          </label>

          <button
            formAction={login}
            className="mt-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            로그인
          </button>
          <button
            formAction={signup}
            className="rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            회원가입
          </button>
        </form>
      </div>
    </main>
  );
}
