import React from 'react';
import { 
  DirectionsRun,
  DirectionsWalk, 
  DirectionsBike,
  Pool,
  SelfImprovement,
  FitnessCenter,
  AccessibilityNew,
  MoreHoriz,
  Weekend,
} from '@mui/icons-material'

export interface Activity {
  date: string;
  timestamp: string;
  exercise_type: string;
  duration: string;
  distance?: string;
  avg_hr?: string;
  max_hr?: string;
  z2_percent?: string;
  above_z2_percent?: string;
  below_z2_percent?: string;
  mafZonePercent?: number;
  pace?: string;
  notes?: string;
}

export interface TrainingPlanEntry {
  date: string;
  exercise_type: string;
  duration_planned_min: string;
  duration_planned_max?: string;
  notes?: string;
}

type ActivityType = 
  | 'Running' 
  | 'Cycling' 
  | 'Swimming'
  | 'Walking'
  | 'Other'
  | 'Dynamix'
  | 'Strength'
  | 'Yoga'
  | 'Agility'
  | 'The Challenge'
  | 'Total Synergistics'
  | 'Long Zone 2 Run'
  | 'Zone 2 Run'
  | 'Rest Day'
  // ... other valid activity types ...
  // Note: 'Generic' is intentionally excluded from valid types 

export const activityTypeToIcon: { [key in ActivityType]: any } = {
  'The Challenge': FitnessCenter,
  'Strength': FitnessCenter,
  'Total Synergistics': FitnessCenter,
  'Long Zone 2 Run': DirectionsRun,
  'Zone 2 Run': DirectionsRun,
  'Running': DirectionsRun,
  'Cycling': DirectionsBike,
  'Swimming': Pool,
  'Walking': DirectionsWalk,
  'Dynamix': AccessibilityNew,
  'Agility': AccessibilityNew,
  'Yoga': SelfImprovement,
  'Other': MoreHoriz,
  'Rest Day': Weekend,
}; 

export function getIconForActivity(type: string) {
  const normalizedType = type.toLowerCase();
  let iconType: keyof typeof activityTypeToIcon = 'Other';

  if (normalizedType.includes('rest')) {
    iconType = 'Rest Day';
  } else if (normalizedType.includes('run') || normalizedType.includes('zone 2')) {
    iconType = 'Running';
  } else if (normalizedType.includes('bike') || normalizedType.includes('cycling')) {
    iconType = 'Cycling';
  } else if (normalizedType.includes('walk')) {
    iconType = 'Walking';
  } else if (normalizedType.includes('yoga')) {
    iconType = 'Yoga';
  } else if (normalizedType.includes('strength') || normalizedType.includes('challenge') || normalizedType.includes('synergistics')) {
    iconType = 'Strength';
  } else if (normalizedType.includes('dynamix')) {
    iconType = 'Dynamix';
  } else if (normalizedType.includes('agility')) {
    iconType = 'Agility';
  }

  return activityTypeToIcon[iconType];
} 