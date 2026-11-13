import { ProjectProvider } from './project/ProjectContext';
import type { ProjectStorage } from './project/storage';
import { ThemeProvider } from './theme/ThemeContext';
import { Workbench } from './workbench/Workbench';

export function App({ storage }: { storage?: () => Promise<ProjectStorage> }) {
  return (
    <ThemeProvider>
      <ProjectProvider storage={storage}>
        <Workbench />
      </ProjectProvider>
    </ThemeProvider>
  );
}
