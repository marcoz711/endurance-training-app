import { useState, useEffect } from 'react';

interface Activity {
  type: string;
  duration: number;
  notes?: string;
  date?: string;
  z2percent?: number;
  pace?: string;
}

interface TodayPlan {
  activities: Activity[];
}

interface WeeklyPlanDay {
  day: string;
  date: string;
  activities: Activity[];
}

interface TrainingData {
  today: TodayPlan;
  recentActivities: Activity[];
}

const useTrainingPlan = () => {
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch TrainingPlan data and filter activities for today
        const todayDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const trainingPlanResponse = await fetch('/api/trainingPlan');
        const trainingPlan = await trainingPlanResponse.json();

        const todaysActivities = trainingPlan.filter((activity: any) => activity.date === todayDate).slice(0, 4);

        // Fetch ActivityLog data and get the last 5 entries
        const activityLogResponse = await fetch('/api/activityLog');
        const activityLog = await activityLogResponse.json();
        
        const recentActivities = activityLog.slice(-5).reverse(); // Get the last 5 activities and reverse to show most recent first

        const fetchedData = {
          today: { activities: todaysActivities },
          recentActivities,
        };

        setData(fetchedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

export default useTrainingPlan;