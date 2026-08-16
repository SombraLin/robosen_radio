import { requestJson } from '../../shared/api/client';
import { AdminNewsSummaryDto } from '../news-console/types';

export interface AdminDashboardDto {
  category_counts: Record<string, number>;
  recent_news: AdminNewsSummaryDto[];
}

export function getAdminDashboard(): Promise<AdminDashboardDto> {
  return requestJson<AdminDashboardDto>('/api/v1/admin/dashboard');
}
