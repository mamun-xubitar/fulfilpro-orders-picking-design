import { sendAppMail } from '@/lib/email.server';
import { createNotification } from '@/lib/notifications.server';

export async function fireTaskEvent(
  event: 'assigned' | 'completed',
  taskId: string,
  taskTitle: string,
  recipientId: string,
  recipientName: string,
  recipientEmail: string,
  actorName: string,
) {
  const isAssigned = event === 'assigned';
  const type = isAssigned ? 'task_assigned' : 'task_completed';
  const title = isAssigned ? 'New task assigned to you' : 'Task marked complete';
  const body = isAssigned
    ? `${actorName} assigned you a task: "${taskTitle}"`
    : `${actorName} completed the task: "${taskTitle}"`;
  const subject = isAssigned
    ? `You have a new task: ${taskTitle}`
    : `Task completed: ${taskTitle}`;
  const html = buildTaskEmail({ taskId, taskTitle, body, recipientName });

  await Promise.all([
    sendAppMail({ to: [recipientEmail], subject, html, text: body }).catch(() => {}),
    createNotification({ recipientId, type, title, body, taskId }),
  ]);
}

export async function fireMessageEvent(
  taskId: string,
  taskTitle: string,
  messageText: string,
  recipientId: string,
  recipientEmail: string,
  senderName: string,
) {
  const body = `${senderName} sent a message on task "${taskTitle}": ${messageText.slice(0, 120)}`;
  const subject = `New message on task: ${taskTitle}`;
  const html = buildTaskEmail({ taskId, taskTitle, body, recipientName: '' });

  await Promise.all([
    sendAppMail({ to: [recipientEmail], subject, html, text: body }).catch(() => {}),
    createNotification({ recipientId, type: 'task_message', title: 'New task message', body, taskId }),
  ]);
}

function buildTaskEmail(params: { taskId: string; taskTitle: string; body: string; recipientName: string }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
      <h2 style="font-size:16px;margin-bottom:8px">${escapeHtml(params.taskTitle)}</h2>
      <p style="color:#555;margin:0 0 16px">${escapeHtml(params.body)}</p>
      <p style="font-size:12px;color:#888">Task ID: ${escapeHtml(params.taskId)}</p>
    </div>`;
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
