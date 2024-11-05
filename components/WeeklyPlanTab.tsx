// components/WeeklyPlanTab.tsx
import React from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'; // Import navigation icons

const WeeklyPlanTab: React.FC = () => {
  return (
    <div className="bg-white shadow rounded-md p-4 text-gray-800">
      <div className="flex justify-between items-center mb-4">
        <button className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none">
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </button>
        <div>
          <h2 className="text-lg font-semibold">Week Overview</h2>
          <p className="text-sm text-gray-600">March 25 - 31</p>
        </div>
        <button className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none">
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </button>
      </div>

      <div className="space-y-4">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
          <div key={day} className="flex justify-between items-center bg-gray-100 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-blue-500 mr-4" />
              <div>
                <h3 className="text-md font-semibold">{day}</h3>
                <p className="text-sm text-gray-600">Zone 2 Run (45 min) - Easy pace</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">March {25 + ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(day)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyPlanTab;