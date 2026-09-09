import type { AiGenerateInput, AiProvider } from './types';

const DEFAULT_MODEL = 'gpt-5-mini';
const REQUEST_TIMEOUT_MS = 30_000;

type OpenAiResponsesPayload = {
  output_text?: string;
  output?: { content?: { type: string; text?: string }[] }[];
};

/** Plain-`fetch` client for OpenAI's Responses API — no `openai` package dependency, matching the
 * project's minimal package.json. See lib/ai/index.server.ts for how this is selected. */
export function createOpenAiProvider(): AiProvider {
  return {
    async generateText({ system, prompt, maxOutputTokens }: AiGenerateInput): Promise<string> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('AI is not configured');

      const model = process.env.AI_MODEL || DEFAULT_MODEL;

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          instructions: system,
          input: prompt,
          max_output_tokens: maxOutputTokens ?? 700,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const json = (await res.json().catch(() => null)) as (OpenAiResponsesPayload & { error?: { message?: string } }) | null;

      if (!res.ok) {
        throw new Error(json?.error?.message || `OpenAI request failed (${res.status})`);
      }
      if (!json) throw new Error('OpenAI returned an unreadable response');

      const text =
        json.output_text ??
        json.output
          ?.flatMap((item) => item.content ?? [])
          .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
          .map((c) => c.text)
          .join('');

      if (!text || !text.trim()) throw new Error('OpenAI returned an empty response');
      return text.trim();
    },
  };
}
