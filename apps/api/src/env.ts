import { z } from 'zod';

const DEV_SECRET = 'trilhacode-segredo-apenas-para-desenvolvimento-troque-em-producao';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória. Veja .env.example.'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_HOST: z.string().default('127.0.0.1'),
    WEB_ORIGIN: z.string().default('http://localhost:5173'),
    /** Endereço público pelo qual o navegador chega à API (usado nos links dos e-mails). */
    PUBLIC_URL: z.string().optional(),
    /** Segredo que assina sessões e tokens. Obrigatório em produção (32+ caracteres). */
    BETTER_AUTH_SECRET: z.string().min(32).default(DEV_SECRET),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default('TrilhaCode <nao-responda@trilhacode.local>'),
    /**
     * Guarda os e-mails em memória e os expõe em GET /api/dev/emails, em vez de enviar.
     * Só para testes automatizados; recusado em produção.
     */
    MAIL_CAPTURE: z.stringbool().default(false),
    /** Limite de tentativas em login, cadastro e recuperação de senha. */
    AUTH_RATE_LIMIT: z.stringbool().default(true),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.BETTER_AUTH_SECRET === DEV_SECRET)
      ctx.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_SECRET'],
        message: 'defina um segredo próprio em produção',
      });
    if (env.NODE_ENV === 'production' && env.MAIL_CAPTURE)
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_CAPTURE'],
        message: 'não pode ser usado em produção',
      });
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuração inválida:\n${problems.join('\n')}`);
  }
  return parsed.data;
}
