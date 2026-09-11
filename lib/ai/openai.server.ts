import type { AiGenerateInput, AiProvider } from './types';

const DEFAULT_MODEL = 'gpt-5-mini';
// Kept comfortably under a typical reverse-proxy read timeout (nginx's default is 60s) so a slow
// call fails with OpenAI's own message instead of the proxy killing the connection first and
// handing the client an HTML error page — which useRequest can't parse as JSON and used to
// relabel as an unhelpful "Network error. Please try again.".
const REQUEST_TIMEOUT_MS = 25_000;

type OpenAiResponsesPayload = {
  output_text?: string;
  output?: { content?: { type: string; text?: string }[] }[];
  status?: string;
  incomplete_details?: { reason?: string };
};

/** Plain-`fetch` client for OpenAI's Responses API — no `openai` package dependency, matching the
 * project's minimal package.json. See lib/ai/index.server.ts for how this is selected. */
export function createOpenAiProvider(): AiProvider {
  return {
    async generateText({ system, prompt, maxOutputTokens }: AiGenerateInput): Promise<string> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('AI is not configured');

      const model = process.env.AI_MODEL || DEFAULT_MODEL;
      // gpt-5* models are reasoning models: max_output_tokens is a shared budget across reasoning
      // + visible output, so a low-effort setting keeps reasoning from starving the actual answer
      // (the failure mode behind the intermittent "OpenAI returned an empty response" error).
      const isReasoningModel = model.startsWith('gpt-5');

      let res: Response;
      try {
        res = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            instructions: system,
            input: prompt,
            max_output_tokens: maxOutputTokens ?? 1500,
            ...(isReasoningModel ? { reasoning: { effort: 'low' } } : {}),
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new Error('The AI provider took too long to respond — try again');
        }
        throw error;
      }

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

      if (!text || !text.trim()) {
        if (json.status === 'incomplete') {
          const reason = json.incomplete_details?.reason;
          throw new Error(
            reason === 'max_output_tokens'
              ? 'OpenAI ran out of output budget before finishing — try again'
              : `OpenAI response was incomplete${reason ? ` (${reason})` : ''}`
          );
        }
        throw new Error('OpenAI returned an empty response');
      }
      return text.trim();
    },
  };
}
