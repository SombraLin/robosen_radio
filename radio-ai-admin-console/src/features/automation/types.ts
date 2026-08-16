export interface AutomationConfigDto {
  enabled: boolean;
  tags: Record<string, number>;
  doll_id: string | null;
  interval_minutes: number;
  version: number;
}

export interface AutomationStatusDto {
  config: AutomationConfigDto;
  scheduler_state: string;
  health_state: string;
  last_run_status: string | null;
  next_run_at: string | null;
  consecutive_failed_runs: number;
}

export interface AutomationRunDto {
  run_id: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  statistics: Record<string, unknown>;
  failure_summary: Record<string, unknown> | null;
}

export interface AutomationRunsPageDto {
  page: number;
  page_size: number;
  total: number;
  items: AutomationRunDto[];
}
