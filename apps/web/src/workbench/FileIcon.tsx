import { languageFor } from '../project/files';

const LABEL = { html: '<>', css: '#', javascript: 'JS' } as const;

export function FileIcon({ name }: { name: string }) {
  const lang = languageFor(name);
  return (
    <span className={`file-icon file-icon-${lang}`} aria-hidden="true">
      {LABEL[lang]}
    </span>
  );
}
