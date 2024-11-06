// components/WeeklyPlanTab.tsx
import React from 'react';
import useTrainingPlan from '@/src/useTrainingPlan';

const WeeklyPlanTab: React.FC = () => {
  const { data, loading, error } = useTrainingPlan();

  if (loading) return <p>Loading weekly plan...</p>;
  if (error) return <p>Error loading weekly plan: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded-md p-4 text-gray-800">
      <h2 className="text-lg font-semibold mb-4">Weekly Plan</h2>
      <div className="space-y-4">
        {data.weeklyPlan.map((activity, index) => (
          <div key={index} className="flex justify-between items-center bg-gray-100 p-4 rounded-lg shadow-sm">
            <span>{activity.activity}</span>
            <span className="text-sm text-gray-600">{activity.date}</span>
            <span className="text-sm text-gray-600">{activity.duration} min</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyPlanTab;
