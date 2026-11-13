import type { MailMessage } from './mailer.js';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inviteEmail(
  to: string,
  classroomName: string,
  teacherName: string,
  url: string,
): MailMessage {
  const lines = [
    `${teacherName} convidou você para a turma "${classroomName}" na TrilhaCode, uma plataforma para aprender programação escrevendo e testando código no navegador.`,
    `Para entrar na turma, crie sua conta usando este mesmo e-mail (${to}). Depois de confirmar o e-mail, a turma aparece automaticamente para você.`,
  ];
  return {
    to,
    subject: `Convite para a turma ${classroomName} na TrilhaCode`,
    text: `${lines.join('\n\n')}\n\nCriar conta: ${url}`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f1f3f6;font-family:system-ui,sans-serif;color:#1c2027">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
<p style="margin:0 0 8px;color:#0f766e;font-weight:600">TrilhaCode</p>
<h1 style="margin:0 0 16px;font-size:22px">Convite para a turma ${escape(classroomName)}</h1>
${lines.map((l) => `<p style="margin:0 0 16px">${escape(l)}</p>`).join('')}
<p style="margin:24px 0"><a href="${escape(url)}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Criar minha conta</a></p>
<p style="margin:0;font-size:13px;color:#4b5361;word-break:break-all">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escape(url)}</p>
</div></body></html>`,
  };
}
