/** Textos dos e-mails enviados pela plataforma. */
import type { MailMessage } from './mailer.js';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(
  title: string,
  paragraphs: string[],
  action: { label: string; url: string },
  footer: string,
) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${escape(p)}</p>`).join('');
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f1f3f6;font-family:system-ui,sans-serif;color:#1c2027">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
<p style="margin:0 0 8px;color:#0f766e;font-weight:600">TrilhaCode</p>
<h1 style="margin:0 0 16px;font-size:22px">${escape(title)}</h1>${body}
<p style="margin:24px 0"><a href="${escape(action.url)}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escape(action.label)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#4b5361;word-break:break-all">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escape(action.url)}</p>
<p style="margin:16px 0 0;font-size:13px;color:#4b5361">${escape(footer)}</p>
</div></body></html>`;
}

export function verificationEmail(to: string, name: string, url: string): MailMessage {
  const paragraphs = [
    `Olá, ${name}.`,
    'Para ativar sua conta na TrilhaCode, confirme que este endereço de e-mail é seu.',
  ];
  const footer = 'O link vale por 24 horas. Se você não criou esta conta, ignore esta mensagem.';
  return {
    to,
    subject: 'Confirme seu e-mail na TrilhaCode',
    text: `${paragraphs.join('\n\n')}\n\nConfirmar e-mail: ${url}\n\n${footer}`,
    html: layout('Confirme seu e-mail', paragraphs, { label: 'Confirmar e-mail', url }, footer),
  };
}

export function resetPasswordEmail(to: string, name: string, url: string): MailMessage {
  const paragraphs = [
    `Olá, ${name}.`,
    'Recebemos um pedido para redefinir a senha da sua conta na TrilhaCode.',
  ];
  const footer =
    'O link vale por 1 hora. Se você não pediu a troca, ignore esta mensagem: sua senha continua a mesma.';
  return {
    to,
    subject: 'Redefinição de senha na TrilhaCode',
    text: `${paragraphs.join('\n\n')}\n\nRedefinir senha: ${url}\n\n${footer}`,
    html: layout('Redefinir senha', paragraphs, { label: 'Criar nova senha', url }, footer),
  };
}
