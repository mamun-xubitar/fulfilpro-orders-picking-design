import { createOpenAiProvider } from './openai.server';
import type { AiProvider } from './types';

/**
 * Resolves the active AI provider from `AI_PROVIDER` (default "openai"). Adding another provider
 * (Anthropic, Gemini, ...) is one new `<name>.server.ts` implementing `AiProvider` plus one more
 * case here — every call site (controllers, prompt builders) stays untouched.
 */
export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  switch (provider) {
    case 'openai':
      return createOpenAiProvider();
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}"`);
  }
}
