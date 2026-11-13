import { z } from 'zod';

/* ------------------------------------------------------------ Entradas */

export const classroomInputSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome à turma.').max(120),
  institution: z.string().trim().max(160).nullable().optional(),
  period: z.string().trim().max(60).nullable().optional(),
});
export type ClassroomInput = z.infer<typeof classroomInputSchema>;

export const studentRowSchema = z.object({
  email: z.string().trim(),
  name: z.string().trim().max(120).optional(),
  /** Linha na planilha (para o relatório de erros). */
  row: z.number().int().positive().optional(),
});
export const addStudentsSchema = z.object({ students: z.array(studentRowSchema).min(1).max(500) });
export type StudentRow = z.infer<typeof studentRowSchema>;

export const assignmentInputSchema = z.object({
  trackId: z.string().min(1),
  /** Data limite no formato AAAA-MM-DD, ou null para sem prazo. */
  dueDate: z.iso.date().nullable(),
});
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const customQuestionSchema = z
  .object({
    enunciado: z.string().trim().min(3, 'Escreva o enunciado.'),
    alternativas: z
      .array(
        z.object({
          texto: z.string().trim().min(1, 'Preencha o texto da alternativa.'),
          correta: z.boolean(),
          feedback: z.string().trim().min(1, 'Escreva o feedback de cada alternativa.'),
        }),
      )
      .min(2, 'Use ao menos 2 alternativas.')
      .max(6),
  })
  .refine((q) => q.alternativas.filter((a) => a.correta).length === 1, {
    message: 'Marque exatamente uma alternativa correta.',
    path: ['alternativas'],
  });

export const customAssessmentInputSchema = z.object({
  title: z.string().trim().min(3, 'Dê um título à avaliação.').max(160),
  description: z.string().trim().max(2000).default(''),
  dueDate: z.iso.date().nullable(),
  minScore: z.number().int().min(0).max(100).default(70),
  questions: z.array(customQuestionSchema).min(1, 'Inclua ao menos uma questão.').max(50),
});
export type CustomAssessmentInput = z.infer<typeof customAssessmentInputSchema>;

export const answersSchema = z.object({ respostas: z.record(z.string(), z.number().int().min(0)) });

/* ------------------------------------------------------------ Respostas */

export type AddStudentStatus =
  'matriculado' | 'convidado' | 'ja-na-turma' | 'ja-convidado' | 'invalido';

export interface AddStudentResult {
  email: string;
  row?: number;
  status: AddStudentStatus;
  message?: string;
}

export interface ClassroomSummary {
  id: string;
  name: string;
  institution: string | null;
  period: string | null;
  /** Papel de quem consulta: professor da turma (responsável ou coprofessor) ou aluno. */
  myRole: 'responsavel' | 'coprofessor' | 'aluno';
  students: number;
  tracks: number;
}

export interface ClassroomPerson {
  id: string;
  name: string;
  email: string;
}

export interface ClassroomDetail extends ClassroomSummary {
  teachers: (ClassroomPerson & { role: 'responsavel' | 'coprofessor' })[];
  enrolled: (ClassroomPerson & { enrolledAt: string })[];
  invitations: { id: string; email: string; name: string | null; createdAt: string }[];
  assignments: { trackId: string; trackTitle: string; dueDate: string | null; units: number }[];
  assessments: { id: string; title: string; dueDate: string | null; questions: number }[];
}

export interface DashboardStudent {
  id: string;
  name: string;
  email: string;
  /** Percentual de etapas concluídas nas trilhas atribuídas. */
  progress: number;
  unitsCompleted: number;
  averageScore: number | null;
  lastActivity: string | null;
  /** Trilhas atribuídas com prazo vencido e não concluídas. */
  overdue: string[];
  customScores: Record<string, number | null>;
}

export interface DashboardUnit {
  id: string;
  title: string;
  trackTitle: string;
  completedPct: number;
  averageScore: number | null;
  averageAttempts: number | null;
  /** Alunos que tentaram a avaliação e ainda não atingiram a nota mínima. */
  struggling: number;
}

export interface ClassroomDashboard {
  students: DashboardStudent[];
  units: DashboardUnit[];
  assessments: { id: string; title: string }[];
  overall: { students: number; progress: number; averageScore: number | null };
}

export interface CustomAssessmentPublic {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  dueDate: string | null;
  minScore: number;
  questions: { enunciado: string; alternativas: string[] }[];
  /** Melhor nota de quem consulta, se for aluno. */
  myBestScore: number | null;
}

export interface CustomAssessmentResult {
  nota: number;
  aprovado: boolean;
  minScore: number;
  questoes: { correta: boolean; respondida: boolean; feedback: string }[];
}

export interface MyClassroom extends ClassroomSummary {
  teachers: string[];
  assignments: { trackId: string; trackTitle: string; dueDate: string | null }[];
  assessments: { id: string; title: string; dueDate: string | null; myBestScore: number | null }[];
}
