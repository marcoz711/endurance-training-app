export interface ActivityLogEntry {
  date: string;
  timestamp: string;
  exercise_type: string;
  duration: string;
  distance: string;
  avg_hr: string;
  max_hr: string;
  z2_percent: string;
  above_z2_percent: string;
  below_z2_percent: string;
  pace: string;
  notes: string;
  isIncomplete?: boolean;
  itemId?: string;
  source?: string;
}

export interface TrainingPlanEntry {
  exercise_type: string;
  duration_planned_min: string;
  duration_planned_max?: string;
  notes?: string;
} 