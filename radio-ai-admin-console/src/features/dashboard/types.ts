import { AdminNewsSummaryDto } from '../news-console/types';

export interface ModuleDiagnosticResult {
  module_id: string;
  module_name: string;
  status: 'healthy' | 'warning' | 'error' | 'testing';
  latency_ms: number;
  tested_at: string;
  summary: string;
  details?: Record<string, any>;
  root_cause?: string | null;
  actionable_remedy?: string | null;
  quick_action?: 'open_api_key_modal' | 'view_automation' | 'view_logs' | 'retry_crawler' | 'view_trash' | string | null;
}

export interface SystemHealthStatusResponse {
  overall_status: 'healthy' | 'degraded' | 'down';
  health_score: number;
  healthy_count: number;
  warning_count: number;
  error_count: number;
  checked_at: string;
  modules: ModuleDiagnosticResult[];
}

export interface AdminDashboardDto {
  category_counts: Record<string, number>;
  recent_news: AdminNewsSummaryDto[];
}
