import "server-only";
import type {
  AiProvider,
  ComposeDiaryInput,
  ComposeDiaryOutput,
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  SummarizeRecordInput,
  SummarizeRecordOutput,
} from "./types";

/**
 * AI 영역 mock 구현 (팀원의 Gemini 구현 전까지 흐름 연결용).
 * 실제 프롬프트/모델 호출 없음 — 형태만 맞춰 반환한다.
 */
export const mockAiProvider: AiProvider = {
  async generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
    return {
      questions: [
        { id: "q_scene", text: `혼자 본 ${input.placeTitle}의 풍경은 어땠나요?` },
        { id: "q_impression", text: "가장 인상적이었던 한 가지는 무엇인가요?" },
        { id: "q_rating", text: "이곳을 별점으로 남긴다면 몇 점인가요?" },
      ],
    };
  },

  async summarizeRecord(input: SummarizeRecordInput): Promise<SummarizeRecordOutput> {
    return {
      summary: `[mock] ${input.placeTitle}에서의 기록: ${input.memo}`,
      tags: ["mock"],
    };
  },

  async composeDiary(input: ComposeDiaryInput): Promise<ComposeDiaryOutput> {
    const places = input.records.map((r) => r.placeTitle).join(", ");
    return { body: `[mock · ${input.tone}] 오늘 다녀온 곳: ${places}` };
  },
};

/** 현재 활성 AI 제공자. 팀원 구현 완료 시 여기만 교체한다. */
export function getAiProvider(): AiProvider {
  // TODO(팀원): Gemini Flash 구현으로 교체
  return mockAiProvider;
}
