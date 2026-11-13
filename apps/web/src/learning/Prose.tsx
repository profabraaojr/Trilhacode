/**
 * Exibe HTML de conteúdo. O HTML vem da compilação em packages/content, que escapa
 * todo HTML bruto escrito pelos autores e só gera marcação a partir do Markdown.
 */
export function Prose({ html, className = '' }: { html: string; className?: string }) {
  if (!html.trim()) return null;
  return <div className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
