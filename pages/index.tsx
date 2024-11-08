import React from 'react';
import useTrainingPlan from '@/src/useTrainingPlan';

const TodayTab = () => {
  const { data, loading, error } = useTrainingPlan();

  if (loading) return <p>Loading data...</p>;
  if (error) return <p>Error loading data: {error.message}</p>;

  return (
    <div>
      <h2>Today's Data</h2>
      <pre>{JSON.stringify(data?.today, null, 2)}</pre>

      <h2>Recent Activities</h2>
      <pre>{JSON.stringify(data?.recentActivities, null, 2)}</pre>
    </div>
  );
};

export default TodayTab;