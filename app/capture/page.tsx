"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sortByCapturedAt } from "@/lib/exif";
import { ensureDisplayable } from "@/lib/image";
import { submitCapture, type CaptureItem } from "@/lib/capture";
import type { TourPlace } from "@/lib/tourapi/client";

type EditItem = CaptureItem & {
  previewUrl: string;
  nearby: TourPlace[];
  nearbyLoaded: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CapturePage() {
  const router = useRouter();
  const [items, setItems] = useState<EditItem[]>([]);
  const [phase, setPhase] = useState<"select" | "edit" | "submitting">("select");
  const [idx, setIdx] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cur = items[idx];

  async function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setPhase("submitting"); // 변환/정렬 동안 잠깐 로딩 표시 재사용
    try {
      console.log("[capture] 선택 파일 수:", fileList.length);
      // EXIF는 원본(HEIC 포함)에서 먼저 읽고 시간순 정렬
      const sorted = await sortByCapturedAt(Array.from(fileList));
      console.log("[capture] EXIF/정렬 완료:", sorted.length);
      // 표시·업로드용으로 HEIC→JPEG 변환 (브라우저 렌더 위해)
      const next: EditItem[] = await Promise.all(
        sorted.map(async ({ file, exif }) => {
          const display = await ensureDisplayable(file);
          return {
            id: uid(),
            file: display,
            caption: "",
            capturedAt: exif.capturedAt,
            lat: exif.lat,
            lng: exif.lng,
            place: null,
            manualLocation: "",
            previewUrl: URL.createObjectURL(display),
            nearby: [],
            nearbyLoaded: false,
          };
        }),
      );
      console.log("[capture] 변환 완료, edit 진입:", next.length);
      setItems(next);
      setIdx(0);
      setPhase("edit");
      loadNearby(next, 0);
    } catch (e) {
      console.error("[capture] onFiles 실패:", e);
      setError("사진 처리 실패: " + (e as Error).message);
      setPhase("select");
    }
  }

  async function loadNearby(list: EditItem[], i: number) {
    const it = list[i];
    if (!it || it.nearbyLoaded || it.lat == null || it.lng == null) return;
    try {
      const res = await fetch(
        `/api/places/nearby?lat=${it.lat}&lng=${it.lng}&radius=2000`,
      );
      const { places } = (await res.json()) as { places?: TourPlace[] };
      const list = (places ?? []).slice(0, 8);
      const nearest = list[0];
      // 아주 가까울 때(≤100m)만 자동 확정 — 먼 후보를 임의로 고르지 않음
      const auto =
        it.place ??
        (nearest && nearest.dist != null && nearest.dist <= 100
          ? nearest
          : null);
      patch(i, { nearby: list, nearbyLoaded: true, place: auto });
    } catch {
      patch(i, { nearbyLoaded: true });
    }
  }

  function patch(i: number, fields: Partial<EditItem>) {
    setItems((prev) =>
      prev.map((it, k) => (k === i ? { ...it, ...fields } : it)),
    );
  }

  async function search() {
    const q = keyword.trim();
    if (!q) return;
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
    const { places } = (await res.json()) as { places?: TourPlace[] };
    patch(idx, { nearby: (places ?? []).slice(0, 8) });
  }

  function go(delta: number) {
    const ni = idx + delta;
    if (ni < 0 || ni >= items.length) return;
    setIdx(ni);
    setKeyword("");
    loadNearby(items, ni);
  }

  async function onSubmit() {
    setPhase("submitting");
    setError(null);
    try {
      await submitCapture(items);
      items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
      setPhase("edit");
    }
  }

  // ── 사진 선택 ──────────────────────────────────────────
  if (phase === "select") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-lg font-bold">사진 선택</h1>
        <p className="text-sm text-neutral-500">
          여러 장을 한 번에 선택하면 촬영시각 순으로 작성합니다.
        </p>
        <label className="cursor-pointer rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white">
          사진 고르기
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
        {error && (
          <p className="max-w-xs rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          onClick={() => router.push("/")}
          className="text-sm text-neutral-400"
        >
          취소
        </button>
      </main>
    );
  }

  // ── 처리 중 (HEIC 변환·정렬) ───────────────────────────
  if (phase === "submitting" && items.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-neutral-500">사진 처리 중…</p>
      </main>
    );
  }

  // ── 사진별 작성 ────────────────────────────────────────
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col p-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <span className="font-semibold">사진별 작성</span>
        <span className="font-mono text-sm text-neutral-500">
          {idx + 1} / {items.length}
        </span>
      </div>

      {cur && (
        <div className="flex flex-1 flex-col gap-3 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.previewUrl}
            alt="선택한 사진"
            className="h-56 w-full rounded-lg object-cover"
          />

          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              🕒 {cur.capturedAt ? cur.capturedAt.slice(0, 16).replace("T", " ") : "시각 없음"}
            </span>
            <span>
              {cur.place
                ? `📍 ${cur.place.title}`
                : cur.manualLocation.trim()
                  ? `📍 ${cur.manualLocation.trim()} (직접)`
                  : "장소 미지정"}
            </span>
          </div>

          <textarea
            value={cur.caption}
            onChange={(e) => patch(idx, { caption: e.target.value })}
            placeholder="이 사진 메모 (선택)"
            className="min-h-16 rounded-lg border border-neutral-300 p-2 text-sm outline-none focus:border-neutral-900"
          />

          {/* 장소 선택 */}
          <div className="rounded-lg border border-neutral-200 p-2">
            <div className="mb-2 flex gap-2">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="한글로 장소 검색"
                className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none"
              />
              <button
                onClick={search}
                className="rounded-md bg-neutral-100 px-3 text-sm"
              >
                검색
              </button>
            </div>
            <input
              value={cur.manualLocation}
              onChange={(e) =>
                patch(idx, { place: null, manualLocation: e.target.value })
              }
              placeholder="직접 입력 (관광지에 없는 곳, 예: ○○카페)"
              className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none"
            />
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              <button
                onClick={() => patch(idx, { place: null, manualLocation: "" })}
                className={`rounded-md px-2 py-1 text-left text-sm ${
                  cur.place == null && !cur.manualLocation.trim()
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-50"
                }`}
              >
                장소 없음
              </button>
              {cur.nearby.map((p) => (
                <button
                  key={p.contentId}
                  onClick={() => patch(idx, { place: p, manualLocation: "" })}
                  className={`rounded-md px-2 py-1 text-left ${
                    cur.place?.contentId === p.contentId
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-50"
                  }`}
                >
                  <div className="text-sm">
                    {p.title}
                    {p.dist != null && (
                      <span className="ml-1 text-xs opacity-60">
                        {Math.round(p.dist)}m
                      </span>
                    )}
                  </div>
                  {p.addr1 && (
                    <div className="text-xs opacity-60">{p.addr1}</div>
                  )}
                </button>
              ))}
              {!cur.nearbyLoaded && cur.lat != null && (
                <span className="px-2 text-xs text-neutral-400">
                  주변 장소 불러오는 중…
                </span>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* 같은 장소 사진은 place_id로 자동 묶임 (CLAUDE §8.6) */}
          <div className="mt-auto flex gap-2 pt-2">
            <button
              onClick={() => go(-1)}
              disabled={idx === 0}
              className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm disabled:opacity-40"
            >
              이전
            </button>
            {idx < items.length - 1 ? (
              <button
                onClick={() => go(1)}
                className="flex-[2] rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white"
              >
                다음
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={phase === "submitting"}
                className="flex-[2] rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {phase === "submitting" ? "저장 중…" : "완료 — 저장"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
