import { useApiHealth } from '../api/useApiHealth';
import { MOBILE_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { DesktopWorkbench } from './DesktopWorkbench';
import { MobileWorkbench } from './MobileWorkbench';

export function Workbench() {
  const api = useApiHealth();
  const mobile = useMediaQuery(MOBILE_QUERY);
  return mobile ? <MobileWorkbench api={api} /> : <DesktopWorkbench api={api} />;
}
