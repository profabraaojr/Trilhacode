import { ThemeProvider } from './theme/ThemeContext';
import { Workbench } from './workbench/Workbench';

export function App() {
  return (
    <ThemeProvider>
      <Workbench />
    </ThemeProvider>
  );
}
