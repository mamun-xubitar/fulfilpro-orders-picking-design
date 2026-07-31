import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import { sendMailerSendMail } from '@/lib/mailersend.server';

export async function sendAppMail(params: { to: string[]; subject: string; html: string; text: string }) {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });

  if (settings?.emailProvider === 'mailersend') {
    if (!settings.mailersendApiToken || !settings.mailersendFromEmail) {
      throw new Error('MailerSend is not configured in settings.');
    }
    return sendMailerSendMail({
      apiToken: settings.mailersendApiToken,
      fromEmail: settings.mailersendFromEmail,
      ...params,
    });
  }

  return sendGoogleMail(params);
}
