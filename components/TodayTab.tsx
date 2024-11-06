// components/TodayTab.tsx
import React from 'react';
import { Footprints, Dumbbell, Activity, CheckCircle } from 'lucide-react';
import useTrainingPlan from '@/src/useTrainingPlan';

const TodayTab: React.FC = () => {
  const { data, loading, error } = useTrainingPlan();

  if (loading) return <p>Loading today’s activities...</p>;
  if (error) return <p>Error loading today’s activities: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded-md p-4 text-gray-800">
      <h2 className="text-lg font-semibold mb-4">Today’s Activities</h2>
      <div className="space-y-4">
        {data.today.map((activity, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              {activity.activity === 'Zone 2 Run' && <Footprints className="h-6 w-6 text-blue-500 mr-4" />}
              {activity.activity === 'Strength' && <Dumbbell className="h-6 w-6 text-purple-500 mr-4" />}
              {activity.activity === 'Mobility' && <Activity className="h-6 w-6 text-green-500 mr-4" />}
              <div>
                <h3 className="text-md font-semibold">{activity.activity} ({activity.duration} min)</h3>
                <p className="text-sm text-gray-600">{activity.notes}</p>
              </div>
            </div>
            <span className="text-green-500 flex items-center">
              <CheckCircle className="h-5 w-5 mr-1" /> Log Activity
            </span>
          </div>
        ))}
      </div>
      <button className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 focus:outline-none">
        Log Other Activity
      </button>
    </div>
  );
};

export default TodayTab;