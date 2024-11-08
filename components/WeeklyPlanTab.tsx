import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/ScrollArea";
import Button from "@/components/ui/Button";
import { Footprints, Dumbbell, Shapes, Activity } from 'lucide-react';
import useTrainingPlan from '@/src/useTrainingPlan';

const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'run':
    case 'zone 2 run':
      return <Footprints className="h-5 w-5 text-blue-600" />;
    case 'strength':
      return <Dumbbell className="h-5 w-5 text-purple-600" />;
    case 'mobility':
    case 'yoga':
      return <Shapes className="h-5 w-5 text-teal-600" />;
    default:
      return <Activity className="h-5 w-5 text-gray-600" />;
  }
};

const WeeklyPlanTab: React.FC = () => {
  const { data, loading, error } = useTrainingPlan();

  if (loading) return <p>Loading weekly plan...</p>;
  if (error) return <p>Error loading weekly plan: {error.message}</p>;

  const days = Array.isArray(data?.weeklyPlan) ? data.weeklyPlan : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-sm font-medium">Weekly Plan</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="default">←</Button>
          <div className="text-sm font-medium">Current Week</div>
          <Button variant="ghost" size="default">→</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] md:h-[600px]">
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="p-3 border-b last:border-0 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-700">{day.day || `Day ${dayIndex + 1}`}</div>
                <div className="text-xs text-gray-500">{day.date}</div>
              </div>
              <div className="rounded-lg border border-gray-200 divide-y">
                {Array.isArray(day.activities) && day.activities.map((activity, idx) => (
                  <div key={idx} className="p-2 bg-gradient-to-r from-gray-50 to-transparent">
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.type)}
                      <span className="text-sm">{activity.type} ({activity.duration} min)</span>
                    </div>
                    {activity.notes && (
                      <div className="text-xs text-gray-500 ml-7 mt-1">{activity.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WeeklyPlanTab;