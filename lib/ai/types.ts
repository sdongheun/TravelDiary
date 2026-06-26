/**
 * AI(Gemini) 작업의 입출력 계약.
 *
 * ⚠️ 실제 Gemini 프롬프트/호출 구현은 팀원이 담당한다 (CLAUDE.md §3).
 * 이 파일은 그 경계의 타입만 정의해, 나머지 흐름(UI·DB·TourAPI)이
 * 먼저 mock 으로 연결되고 나중에 실제 구현이 끼워지도록 한다.
 *
 * AI 호출은 반드시 서버(API Route)에서만 — Gemini 키 클라이언트 비노출.
 */

export type DiaryTone = "plain" | "emotional" | "humor"; // 담백 · 감성 · 유머

/** ① 카테고리별 + 혼행 정서 질문 생성 */
export interface GenerateQuestionsInput {
  placeTitle: string;
  contentTypeId?: string; // TourAPI 카테고리 (자연/문화/맛집 분기)
  placeOverview?: string; // TourAPI 공식 설명 (감정 환기 재료)
  locale?: string; // 다국어 (1차: 'ko')
}
export interface GenerateQuestionsOutput {
  questions: { id: string; text: string }[];
}

/** ② 메모 + 답변 → 감정·상황 정리 */
export interface SummarizeRecordInput {
  placeTitle: string;
  memo: string;
  answers: { questionId: string; text: string }[];
  locale?: string;
}
export interface SummarizeRecordOutput {
  summary: string; // 정리된 상황·감정
  tags: string[]; // 카테고리/감정 태깅
}

/** ③ 정리된 재료 → 일기 본문 (문체 선택) */
export interface ComposeDiaryInput {
  tone: DiaryTone;
  records: { placeTitle: string; summary: string; time?: string }[];
  locale?: string;
}
export interface ComposeDiaryOutput {
  body: string;
}

/** AI 제공자 인터페이스 — mock 과 실제 Gemini 구현이 이 형태를 만족한다. */
export interface AiProvider {
  generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput>;
  summarizeRecord(input: SummarizeRecordInput): Promise<SummarizeRecordOutput>;
  composeDiary(input: ComposeDiaryInput): Promise<ComposeDiaryOutput>;
}
