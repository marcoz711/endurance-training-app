// pages/today.tsx
import Layout from '../components/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Footprints, Dumbbell, Activity, Timer, CheckCircle2, Plus } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useState, useEffect } from 'react';

const Today = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [plannedActivities, setPlannedActivities] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const [trainingPlanRes, activityLogRes] = await Promise.all([
          fetch('/api/trainingPlan'),
          fetch('/api/activityLog'),
        ]);

        if (!trainingPlanRes.ok || !activityLogRes.ok) {
          throw new Error('Failed to fetch data from one or more endpoints');
        }

        const trainingPlanData = await trainingPlanRes.json();
        const activityLogData = await activityLogRes.json();

        const todayDate = new Date().toISOString().split('T')[0];
        const todayPlannedActivities = trainingPlanData.filter(
          (activity: any) => activity.date === todayDate
        );

        const recentActivities = activityLogData.slice(0, 2);

        setPlannedActivities(todayPlannedActivities);
        setRecentActivities(recentActivities);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'run':
      case 'zone 2 run':
        return <Footprints className="h-5 w-5 text-blue-600" />;
      case 'strength':
        return <Dumbbell className="h-5 w-5 text-purple-600" />;
      default:
        return <Activity className="h-5 w-5 text-teal-600" />;
    }
  };

  return (
    <Layout>
      <ScrollArea>
        <div className="space-y-6">
          <Card className="p-4 shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Today's Training</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plannedActivities.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded-lg p-3 shadow-sm bg-gray-50">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(activity.exercise_type)}
                    <div>
                      <div className="font-medium">{activity.exercise_type}</div>
                      <div className="text-sm text-gray-500">
                        {activity.duration_planned_min} - {activity.duration_planned_max} min
                      </div>
                      {activity.notes && (
                        <div className="text-xs text-gray-400">{activity.notes}</div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Log
                  </Button>
                </div>
              ))}
              <Button variant="ghost" className="mt-2 text-blue-600 hover:text-blue-700 w-full flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Log Other Activity
              </Button>
            </CardContent>
          </Card>

          <Card className="p-4 shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] space-y-2">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="p-3 border rounded-lg shadow-sm bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.exercise_type)}
                        <div>
                          <span className="font-medium">{activity.exercise_type}</span>
                          {activity.duration && (
                            <div className="text-xs text-gray-500">{activity.duration} minutes</div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{activity.date}</span>
                    </div>
                    {/* Display colored boxes if data is available */}
                    {(activity.distance || activity.z2_percent || activity.pace) && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {activity.distance && (
                          <div className="bg-blue-100 rounded p-2 text-center">
                            <div className="text-xs text-blue-600">Distance</div>
                            <div className="text-sm font-medium">{activity.distance} km</div>
                          </div>
                        )}
                        {activity.z2_percent && (
                          <div className="bg-green-100 rounded p-2 text-center">
                            <div className="text-xs text-green-600">Zone 2</div>
                            <div className="text-sm font-medium">{activity.z2_percent}%</div>
                          </div>
                        )}
                        {activity.pace && (
                          <div className="bg-purple-100 rounded p-2 text-center">
                            <div className="text-xs text-purple-600">Pace</div>
                            <div className="text-sm font-medium">{activity.pace}/km</div>
                          </div>
                        )}
                      </div>
                    )}
                    {activity.notes && (
                      <div className="text-xs text-gray-400 mt-2">{activity.notes}</div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </Layout>
  );
};

export default Today;