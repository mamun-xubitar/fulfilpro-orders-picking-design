/** Provider-agnostic contract every AI backend implements — keeps call sites (and the prompt
 * builders they use) free of any particular vendor's SDK or request shape. */
export type AiGenerateInput = {
  system: string;
  prompt: string;
  maxOutputTokens?: number;
};

export type AiProvider = {
  generateText(input: AiGenerateInput): Promise<string>;
};
