import { z } from 'zod';
import { ActivityLogEntry } from '../types/activity';

export const ActivityLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  exercise_type: z.string().min(1),
  duration: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  distance: z.number().optional(),
  avg_hr: z.number().optional(),
  max_hr: z.number().optional(),
  z2_percent: z.number().optional(),
  above_z2_percent: z.number().optional(),
  below_z2_percent: z.number().optional(),
  pace: z.string().optional(),
  notes: z.string().optional(),
  maf_zone_percent: z.number().optional(),
});

export function validateActivityLog(activity: Partial<ActivityLogEntry>): ActivityLogEntry {
  return {
    date: activity.date || 'N/A',
    timestamp: activity.timestamp || 'N/A',
    exercise_type: activity.exercise_type || 'Unknown',
    duration: activity.duration || 'N/A',
    distance: activity.distance || '0.00',
    avg_hr: activity.avg_hr || 'N/A',
    max_hr: activity.max_hr || 'N/A',
    z2_percent: activity.z2_percent || 'N/A',
    above_z2_percent: activity.above_z2_percent || 'N/A',
    below_z2_percent: activity.below_z2_percent || 'N/A',
    pace: activity.pace || 'N/A',
    notes: activity.notes || '',
    isIncomplete: activity.isIncomplete || false,
    itemId: activity.itemId || '',
    source: activity.source || '',
    mafZonePercent: activity.mafZonePercent || 0,
    maf_zone_percent: (activity.maf_zone_percent || 0).toString()
  };
}

export const ActivityLogRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  exercise_type: z.string().min(1),
  duration: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  distance: z.string().optional(),
  avg_hr: z.number().optional(),
  max_hr: z.number().optional(),
  z2_percent: z.number().min(0).max(100).optional(),
  above_z2_percent: z.number().min(0).max(100).optional(),
  below_z2_percent: z.number().min(0).max(100).optional(),
  maf_zone_percent: z.number().min(0).max(100).optional(),
  gps: z.any().optional(),
  provider: z.string().optional(),
  providerType: z.string().optional(),
  itemId: z.string().optional(),
  pace: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  notes: z.string().optional()
});

export const validateActivityLogRequest = (data: unknown) => {
  return ActivityLogRequestSchema.safeParse(data);
}; 