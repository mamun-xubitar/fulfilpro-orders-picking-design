import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { ConversationController } from '@/controllers/conversation.controller.server';

const controller = new ConversationController();

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError({ message: 'Unauthorized', status: 401 });
  const result = await controller.messageableUsers(session);
  return apiSuccess({ message: result.message, data: result.data });
}
