// pages/weeklyPlan.tsx
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { Activity } from 'lucide-react';
import { ActivityLogEntry, TrainingPlanEntry, getIconForActivity } from '../types/activity';

const WeeklyPlan = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<TrainingPlanEntry[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    const loadWeeklyPlan = async () => {
      setLoading(true);
      setError(null);

      try {
        const startOfCurrentWeek = getStartOfWeek(currentWeek);
        const endOfCurrentWeek = getEndOfWeek(currentWeek);

        const response = await fetch(`/api/trainingPlan?start=${startOfCurrentWeek}&end=${endOfCurrentWeek}`);
        const data = await response.json();

        if (response.ok) {
          if (data.length === 0) {
            setError('No data available for this week.');
          } else {
            setWeeklyPlan(data);
          }
        } else {
          setError(data.error || 'Failed to load weekly plan.');
        }
      } catch (err) {
        setError('Failed to load weekly plan. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyPlan();
  }, [currentWeek]);

  const handlePreviousWeek = () => setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() - 7)));
  const handleNextWeek = () => setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() + 7)));
  const resetToCurrentWeek = () => setCurrentWeek(new Date());

  const getStartOfWeek = (date: Date) => {
    const day = date.getDay();
    // Adjust the start date to the previous Monday if today is Sunday (day 0)
    const start = new Date(date);
    start.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return start.toISOString().split('T')[0];
  };
  
  const getEndOfWeek = (date: Date) => {
    const day = date.getDay();
    // Adjust the end date to Sunday if today is Sunday (day 0)
    const end = new Date(date);
    end.setDate(date.getDate() + (day === 0 ? 0 : 7 - day));
    return end.toISOString().split('T')[0];
  };

  // Group entries by date for display purposes
  const groupedEntries = weeklyPlan.reduce((acc: { [date: string]: TrainingPlanEntry[] }, entry) => {
    (acc[entry.date] = acc[entry.date] || []).push(entry);
    return acc;
  }, {});

  return (
    <Layout>
      <ScrollArea>
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={handlePreviousWeek} 
              className="px-4 py-2 bg-white text-blue-600 rounded-md 
                disabled:bg-gray-100 disabled:text-blue-400
                hover:bg-blue-50 flex items-center gap-2"
            >
              &lt; Previous
            </button>
            <span className="font-medium">
              {new Date(getStartOfWeek(currentWeek)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {new Date(getEndOfWeek(currentWeek)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button 
              onClick={handleNextWeek}
              className="px-4 py-2 bg-white text-blue-600 rounded-md 
                disabled:bg-gray-100 disabled:text-blue-400
                hover:bg-blue-50 flex items-center gap-2"
            >
              Next &gt;
            </button>
          </div>

          {loading && <LoadingSpinner />}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && weeklyPlan.length > 0 && (

            <div className="space-y-4">
              {Object.entries(groupedEntries).map(([date, activities]) => (
                <Card key={date} className="p-4 shadow-md rounded-lg">
                  <CardHeader>
                    <CardTitle>
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-top justify-between border rounded-lg p-3 shadow-sm bg-gray-50"
                      >
                        <div className="flex items-top gap-2">
                          {(() => {
                            const IconComponent = getIconForActivity(activity.exercise_type);
                            return <IconComponent className="mt-1 h-5 w-5 text-teal-600" />;
                          })()}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <button 
              onClick={resetToCurrentWeek} 
              className="px-4 py-2 bg-white text-blue-600 rounded-md 
                disabled:bg-gray-100 disabled:text-blue-400
                hover:bg-blue-50 flex items-center gap-2 mx-auto"
            >
              Reset to Current Week
            </button>
          </div>
        </div>
      </ScrollArea>
    </Layout>
  );
};

export default WeeklyPlan;