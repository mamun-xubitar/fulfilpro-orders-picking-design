export async function sendMailerSendMail({
  apiToken,
  fromEmail,
  to,
  subject,
  html,
  text,
}: {
  apiToken: string;
  fromEmail: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      from: { email: fromEmail },
      to: to.map((email) => ({ email })),
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send MailerSend email (${response.status}): ${body}`);
  }
}
