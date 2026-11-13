import { fromNodeHeaders } from 'better-auth/node';
import type { UserRole } from '@trilhacode/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Auth } from '../auth.js';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  institution: string | null;
  createdAt: Date;
}

export async function getSessionUser(auth: Auth, req: FastifyRequest): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; institution?: string | null };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    role: (u.role ?? 'aluno') as UserRole,
    institution: u.institution ?? null,
    createdAt: new Date(u.createdAt),
  };
}

/** Exige sessão (e, opcionalmente, um dos papéis). Responde 401/403 e devolve null quando falha. */
export async function requireUser(
  auth: Auth,
  req: FastifyRequest,
  reply: FastifyReply,
  roles?: UserRole[],
): Promise<SessionUser | null> {
  const user = await getSessionUser(auth, req);
  if (!user) {
    await reply.code(401).send({ erro: 'Entre na sua conta para continuar.' });
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    await reply.code(403).send({ erro: 'Você não tem permissão para esta ação.' });
    return null;
  }
  return user;
}
