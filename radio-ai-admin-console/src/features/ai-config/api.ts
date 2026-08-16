import { requestJson } from '../../shared/api/client';
import { GenerativeConfig } from '../../shared/types';

export function getGenerativeConfigApi(): Promise<GenerativeConfig> {
  return requestJson<GenerativeConfig>('/api/v1/radio-ai/generative-config');
}

export function updateGenerativeConfigApi(config: Partial<GenerativeConfig>): Promise<GenerativeConfig> {
  return requestJson<GenerativeConfig>('/api/v1/radio-ai/generative-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}
