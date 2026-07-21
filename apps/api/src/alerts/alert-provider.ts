import { IncidentAlert } from './incident-alert';

export interface AlertProvider {
  sendIncidentOpened(alert: IncidentAlert): Promise<void>;
  sendIncidentResolved(alert: IncidentAlert): Promise<void>;
}
