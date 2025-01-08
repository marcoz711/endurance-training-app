// pages/today.tsx

import Layout from '../components/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Footprints, Dumbbell, Activity, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LoadingSpinner from '@/components/LoadingSpinner';

const Today = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [plannedActivities, setPlannedActivities] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const todayDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Fetch activities from the last 7 days

        const [trainingPlanRes, activityLogRes] = await Promise.all([
          fetch('/api/trainingPlan'),
          fetch(`/api/activityLog?startDate=${startDate.toISOString().split('T')[0]}&endDate=${todayDate}`),
        ]);

        if (!trainingPlanRes.ok || !activityLogRes.ok) {
          throw new Error('Failed to fetch data from one or more endpoints');
        }

        const trainingPlanData = await trainingPlanRes.json();
        const activityLogData = await activityLogRes.json();

        const todayPlannedActivities = trainingPlanData.filter(
          (activity: any) => activity.date === todayDate
        );

        setPlannedActivities(todayPlannedActivities);
        setRecentActivities(activityLogData.slice(0, 5)); // Keep the last 5 activities
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
        return <Footprints className="mt-1 h-5 w-5 text-blue-600" />;
      case 'strength':
        return <Dumbbell className="mt-1 h-5 w-5 text-purple-600" />;
      default:
        return <Activity className="mt-1 h-5 w-5 text-teal-600" />;
    }
  };

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  const handleLogActivity = () => {
    router.push('/logActivity');
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollArea>
        <div className="space-y-6">
          <Card className="p-4 shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Today's Training - {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plannedActivities.map((activity, idx) => (
                <div key={idx} className="flex items-top justify-between border rounded-lg p-3 shadow-sm bg-gray-50">
                  <div className="flex items-top gap-2">
                    {getActivityIcon(activity.exercise_type)}
                    <div>
                      <div className="font-medium">{activity.exercise_type}</div>
                      <div className="text-sm text-gray-500">
                        Duration: {activity.duration_planned_min}
                        {activity.duration_planned_max && (
                          <span> - {activity.duration_planned_max}</span>
                        )}
                        &nbsp;min
                      </div>
                      {activity.notes && (
                        <div className="text-sm text-gray-400">Note: {activity.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="mt-2 text-blue-600 hover:text-blue-700 w-full flex items-center justify-center" onClick={handleLogActivity}>
                <Plus className="h-4 w-4 mr-2" />
                Log Activity Now
              </Button>
            </CardContent>
          </Card>

          <Card className="p-4 shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="p-3 border rounded-lg shadow-sm bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-top gap-2">
                      {getActivityIcon(activity.exercise_type)}
                      <div>
                        <span className="font-medium">{activity.exercise_type}</span>
                        {activity.duration && (
                          <div className="text-sm text-gray-500">
                            Duration: {activity.duration}
                          </div>
                        )}
                        {activity.notes && (
                          <div className="text-sm text-gray-500"> Note: {activity.notes}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(activity.date)}</span>
                  </div>
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
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </Layout>
  );
};

export default Today;