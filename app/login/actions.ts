"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** 이메일+비밀번호 로그인 */
export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** 이메일+비밀번호 회원가입 */
export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // 이메일 확인(Confirm email)이 켜져 있으면 session 이 없다 → 안내 후 로그인 대기
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료한 뒤 로그인하세요.",
      )}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** 로그아웃 */
export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
