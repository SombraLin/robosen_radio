import { requestJson } from '../../shared/api/client';
import { AutomationStatusDto, AutomationConfigDto, AutomationRunsPageDto } from './types';

export function getAutomationStatus(): Promise<AutomationStatusDto> {
  return requestJson<AutomationStatusDto>('/api/v1/radio-ai/automation');
}

export function updateAutomationConfig(config: Partial<AutomationConfigDto>): Promise<AutomationConfigDto> {
  return requestJson<AutomationConfigDto>('/api/v1/radio-ai/automation/config', {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

export function updateAutomationState(enabled: boolean): Promise<{ enabled: boolean; scheduler_state: string }> {
  return requestJson('/api/v1/radio-ai/automation/state', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

export function getAutomationRuns(page = 1, pageSize = 20): Promise<AutomationRunsPageDto> {
  return requestJson<AutomationRunsPageDto>(`/api/v1/radio-ai/automation/runs?page=${page}&page_size=${pageSize}`);
}

export function triggerManualRun(payload: {
  tag?: string;
  limit?: number;
  doll_id?: string;
  generate_audio?: boolean;
  generate_commentary?: boolean;
}): Promise<any> {
  return requestJson('/api/v1/radio-ai/automation/runs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
