import { requestJson } from '../../shared/api/client';
import { AdminDashboardDto, SystemHealthStatusResponse, ModuleDiagnosticResult } from './types';

export function getAdminDashboard(): Promise<AdminDashboardDto> {
  return requestJson<AdminDashboardDto>('/api/v1/admin/dashboard');
}

export function getSystemHealthStatusApi(): Promise<SystemHealthStatusResponse> {
  return requestJson<SystemHealthStatusResponse>('/api/v1/admin/health/status');
}

export async function runModuleDiagnosticApi(
  moduleId?: string
): Promise<{ mode: string; module?: string; result?: ModuleDiagnosticResult; results?: ModuleDiagnosticResult[] }> {
  return requestJson('/api/v1/admin/health/diagnose', {
    method: 'POST',
    body: JSON.stringify(moduleId ? { module: moduleId } : {}),
  });
}
