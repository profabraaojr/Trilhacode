/** Papéis de usuário. A verificação de permissões acontece sempre na API. */
export const USER_ROLES = ['aluno', 'professor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
