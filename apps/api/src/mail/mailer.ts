import nodemailer from 'nodemailer';
import type { Env } from '../env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
  /** Só no modo de captura: mensagens enviadas, da mais antiga à mais recente. */
  outbox?: MailMessage[];
}

export function createSmtpMailer(env: Env): Mailer {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
  });
  return {
    async send(m) {
      await transport.sendMail({ from: env.MAIL_FROM, ...m });
    },
  };
}

export function createCaptureMailer(): Mailer {
  const outbox: MailMessage[] = [];
  return {
    outbox,
    async send(m) {
      outbox.push(m);
    },
  };
}
