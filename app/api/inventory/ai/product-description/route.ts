import { NextRequest } from 'next/server';
import { AiDescriptionController } from '@/controllers/ai-description.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new AiDescriptionController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

// OpenAI generation can run close to the default serverless/proxy timeout — raise the ceiling so a
// slow (but successful) call doesn't get killed by the platform before the app's own AbortSignal
// timeout in lib/ai/openai.server.ts even has a chance to fire.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json().catch(() => ({}));
  const result = await controller.generate(body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
