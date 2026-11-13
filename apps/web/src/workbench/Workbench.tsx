import { useApiHealth } from '../api/useApiHealth';
import { MOBILE_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { DesktopWorkbench } from './DesktopWorkbench';
import { MobileWorkbench } from './MobileWorkbench';
import { useAutoRun } from './useAutoRun';

export function Workbench() {
  const api = useApiHealth();
  useAutoRun();
  const mobile = useMediaQuery(MOBILE_QUERY);
  return mobile ? <MobileWorkbench api={api} /> : <DesktopWorkbench api={api} />;
}
