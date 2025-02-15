export interface ActivityLogEntry {
  date: string;
  timestamp: string;
  exercise_type: string;
  duration: string;
  distance?: number;
  avg_hr?: number;
  max_hr?: number;
  z2_percent?: number;
  above_z2_percent?: number;
  below_z2_percent?: number;
  pace?: string;
  notes?: string;
  isIncomplete?: boolean;
  itemId?: string;
  source?: string;
}

export interface TrainingPlanEntry {
  date: string;
  exercise_type: string;
  duration_planned_min: number;
  duration_planned_max?: number;
  notes?: string;
}

export interface ProgressMetric {
  date: string;
  metric_type: string;
  value: string | number;
} 