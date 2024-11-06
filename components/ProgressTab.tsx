// components/ProgressTab.tsx
import React from 'react';
import useTrainingPlan from '@/src/useTrainingPlan';

const ProgressTab: React.FC = () => {
  const { data, loading, error } = useTrainingPlan();

  if (loading) return <p>Loading progress data...</p>;
  if (error) return <p>Error loading progress data: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded-md p-4 text-gray-800">
      <h2 className="text-lg font-semibold mb-4">Progress Overview</h2>
      <div className="space-y-4">
        {data.progress.map((activity, index) => (
          <div key={index} className="flex justify-between items-center bg-gray-100 p-4 rounded-lg shadow-sm">
            <span>{activity.activity}</span>
            <span className="text-sm text-gray-600">{activity.date}</span>
            <span className="text-sm text-gray-600">{activity.duration} min • {activity.notes}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTab;