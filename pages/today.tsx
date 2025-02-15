// pages/today.tsx

import Layout from '../components/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import Button from "@/components/ui/Button";
import { Footprints, Dumbbell, Activity, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useActivities } from '../hooks/useActivities';
import { ActivityLogEntry, TrainingPlanEntry } from '../types/activity';
import { format } from 'date-fns';

const Today = () => {
  const router = useRouter();
  const [plannedActivities, setPlannedActivities] = useState<TrainingPlanEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(5); // Initial number of activities to show
  const todayDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Fetch last 30 days of activities
  
  const { activities: recentActivities, isLoading, isError } = useActivities(
    startDate.toISOString().split('T')[0],
    todayDate
  );

  // Sort activities by date and time, most recent first
  const sortedActivities = recentActivities?.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.timestamp}`);
    const dateB = new Date(`${b.date}T${b.timestamp}`);
    return dateB.getTime() - dateA.getTime();
  });

  // Get only the activities to display based on displayCount
  const displayedActivities = sortedActivities?.slice(0, displayCount);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 3);
  };

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const trainingPlanRes = await fetch(`/api/trainingPlan?start=${todayDate}&end=${todayDate}`);
        if (!trainingPlanRes.ok) {
          throw new Error('Failed to fetch training plan');
        }

        const trainingPlanData = await trainingPlanRes.json();
        setPlannedActivities(trainingPlanData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch training plan');
        console.error('Error fetching data:', error);
      }
    };

    fetchTodayData();
  }, [todayDate]);

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

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const syncActivities = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/fitnessSyncer/syncActivities', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResult(`Successfully synced ${data.newActivities} new activities`);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <div>Error loading activities</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Layout>
      <div>
        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Today's Training - {format(new Date(), 'EEEE, MMM d')}
              </h3>
            </div>
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
        <Card className="mb-4">
          <div className="relative">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
                <button
                  onClick={syncActivities}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-white text-blue-600 rounded-md 
                    disabled:bg-gray-100 disabled:text-blue-400
                    hover:bg-blue-50 flex items-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync Activities'
                  )}
                </button>
              </div>
              {syncResult && (
                <div className="flex justify-center mt-4 mb-2">
                  <p className={`text-sm ${syncResult.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
                    {syncResult}
                  </p>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {displayedActivities?.map((activity: ActivityLogEntry) => (
                <div 
                  key={`${activity.date}-${activity.timestamp}`} 
                  className="p-4 rounded-lg border bg-gray-50"
                >
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
              
              {/* Load More Button */}
              {sortedActivities && displayCount < sortedActivities.length && (
                <div className="flex justify-center pt-2">
                  <Button 
                    onClick={handleLoadMore}
                    variant="outline"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Today;