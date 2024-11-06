// src/useTrainingPlan.ts
import { useState, useEffect } from 'react';

export default function useTrainingPlan() {
  const [data, setData] = useState({ today: [], progress: [], weeklyPlan: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [todayResponse, progressResponse, weeklyPlanResponse] = await Promise.all([
          fetch('/api/todayData'),
          fetch('/api/progressData'),
          fetch('/api/weeklyPlanData'),
        ]);

        const todayData = await todayResponse.json();
        const progressData = await progressResponse.json();
        const weeklyPlanData = await weeklyPlanResponse.json();

        setData({
          today: todayData,
          progress: progressData,
          weeklyPlan: weeklyPlanData,
        });
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}